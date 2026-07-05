import {
  Check,
  LockKeyhole,
  LoaderCircle,
  Send,
  ShieldCheck,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import {
  createEmptyFriendsPrivacySnapshot,
  createFriendsPrivacyService,
  loadFriendsPrivacySnapshot,
  persistFriendsPrivacySnapshot,
  type FriendsPrivacyServiceActions,
  type FriendsPrivacyServiceState,
  type FriendsPrivacySnapshotRepository,
} from '@/application/friends/friendsPrivacyService';
import { sendExactFriendRequest } from '@/application/friends/socialFriendRequestService';
import {
  checkSocialHandleAvailability,
  loadSocialIdentity,
  saveSocialIdentity,
  unavailableSocialUserLookupGateway,
  type SocialIdentityRepository,
  type SocialUserLookupGateway,
} from '@/application/friends/socialIdentityService';
import {
  FRIEND_ACTIVITY_PERMISSION_LABELS,
  FRIEND_ACTIVITY_SHARING_LABELS,
  FRIEND_PROFILE_VISIBILITY_LABELS,
  evaluateFriendActivitySharingGuard,
  evaluateFriendScopedActivitySharingGuard,
  summarizeFriendsPrivacy,
  type FriendActivitySharingLevel,
  type FriendRequest,
  type FriendsPrivacySnapshot,
  type FriendVisibilityLevel,
} from '@/domain/friends/friendship';
import {
  createDefaultSocialIdentity,
  formatSocialHandle,
  validateSocialHandle,
  type SocialIdentity,
  type SocialIdentityAvailabilityResult,
} from '@/domain/friends/socialIdentity';
import { appDatabase } from '@/infrastructure/database/database';
import { DexieFriendsPrivacyRepository } from '@/infrastructure/repositories/dexie/DexieFriendsPrivacyRepository';
import { DexieSocialIdentityRepository } from '@/infrastructure/repositories/dexie/DexieSocialIdentityRepository';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface FriendsPrivacyPageProps {
  readonly initialSnapshot?: FriendsPrivacySnapshot;
  readonly repository?: FriendsPrivacySnapshotRepository;
  readonly initialIdentity?: SocialIdentity;
  readonly identityRepository?: SocialIdentityRepository;
  readonly lookupGateway?: SocialUserLookupGateway;
}

const visibilityOptions: readonly FriendVisibilityLevel[] = ['private', 'friends', 'public'];
const sharingOptions: readonly FriendActivitySharingLevel[] = ['disabled', 'summary-only', 'detailed'];
const initialAvailability: SocialIdentityAvailabilityResult = {
  status: 'idle',
  message: 'Vérification non lancée.',
};

function formatRequestDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function requestStatusLabel(request: FriendRequest): string {
  if (request.status === 'accepted') return 'Acceptée';
  if (request.status === 'declined') return 'Refusée';
  return request.direction === 'incoming' ? 'À valider' : 'Envoyée';
}

export function FriendsPrivacyPage({
  initialSnapshot,
  repository,
  initialIdentity,
  identityRepository,
  lookupGateway,
}: FriendsPrivacyPageProps = {}) {
  const [defaultRepository] = useState(() =>
    initialSnapshot ? undefined : new DexieFriendsPrivacyRepository(appDatabase),
  );
  const [defaultIdentityRepository] = useState(() =>
    repository || initialSnapshot || initialIdentity ? undefined : new DexieSocialIdentityRepository(appDatabase),
  );
  const activeRepository = repository ?? defaultRepository;
  const activeIdentityRepository = identityRepository ?? defaultIdentityRepository;
  const activeLookupGateway = lookupGateway ?? unavailableSocialUserLookupGateway;
  const initialSnapshotState = useMemo(
    () => initialSnapshot ?? createEmptyFriendsPrivacySnapshot(),
    [initialSnapshot],
  );
  const initialIdentityState = useMemo(
    () => initialIdentity ?? createDefaultSocialIdentity(),
    [initialIdentity],
  );
  const [snapshot, setSnapshot] = useState<FriendsPrivacyServiceState>(() =>
    initialSnapshotState,
  );
  const [identity, setIdentity] = useState<SocialIdentity>(() =>
    initialIdentityState,
  );
  const [handle, setHandle] = useState('');
  const [identityHandle, setIdentityHandle] = useState(() => formatSocialHandle(identity.handle));
  const [displayName, setDisplayName] = useState(identity.displayName);
  const [availability, setAvailability] = useState<SocialIdentityAvailabilityResult>(initialAvailability);
  const [identityFeedback, setIdentityFeedback] = useState<string>();
  const [requestFeedback, setRequestFeedback] = useState<string>();
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isLoading, setIsLoading] = useState(() => Boolean(
    (activeRepository && !initialSnapshot) || (activeIdentityRepository && !initialIdentity),
  ));
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    const shouldLoadSnapshot = Boolean(activeRepository && !initialSnapshot);
    const shouldLoadIdentity = Boolean(activeIdentityRepository && !initialIdentity);
    if (!shouldLoadSnapshot && !shouldLoadIdentity) return undefined;

    let active = true;
    setIsLoading(true);
    setErrorMessage(undefined);

    void Promise.all([
      shouldLoadSnapshot && activeRepository
        ? loadFriendsPrivacySnapshot(activeRepository)
        : Promise.resolve(initialSnapshotState),
      shouldLoadIdentity && activeIdentityRepository
        ? loadSocialIdentity(activeIdentityRepository)
        : Promise.resolve(initialIdentityState),
    ])
      .then(([loadedSnapshot, loadedIdentity]) => {
        if (!active) return;
        setSnapshot(loadedSnapshot);
        setIdentity(loadedIdentity);
        setIdentityHandle(formatSocialHandle(loadedIdentity.handle));
        setDisplayName(loadedIdentity.displayName);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Les données amis n’ont pas pu être chargées.',
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    activeRepository,
    activeIdentityRepository,
    initialSnapshot,
    initialIdentity,
    initialSnapshotState,
    initialIdentityState,
  ]);

  const summary = useMemo(() => summarizeFriendsPrivacy(snapshot), [snapshot]);
  const sharingGuard = useMemo(() => evaluateFriendActivitySharingGuard(snapshot), [snapshot]);
  const handleValidation = useMemo(() => validateSocialHandle(identityHandle), [identityHandle]);
  const incomingRequests = snapshot.requests.filter((request) => request.direction === 'incoming');
  const outgoingRequests = snapshot.requests.filter((request) => request.direction === 'outgoing');

  const persistSnapshot = (next: FriendsPrivacyServiceState) => {
    setSnapshot(next);
    setErrorMessage(undefined);

    if (!activeRepository) return;

    void persistFriendsPrivacySnapshot(activeRepository, next).catch((error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Les changements amis n’ont pas pu être enregistrés.',
      );
    });
  };

  const update = (
    action: (actions: FriendsPrivacyServiceActions) => FriendsPrivacyServiceState,
  ) => {
    const service = createFriendsPrivacyService(snapshot);
    persistSnapshot(action(service.actions));
  };

  const submitRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRequestFeedback(undefined);
    setErrorMessage(undefined);
    setIsSendingRequest(true);

    void sendExactFriendRequest({
      snapshot,
      identity,
      handle,
      lookupGateway: activeLookupGateway,
    })
      .then((result) => {
        setRequestFeedback(result.message);
        if (result.status === 'sent') {
          persistSnapshot({ ...result.snapshot, lastFeedback: result.message });
          setHandle('');
        }
      })
      .catch((error) => {
        setRequestFeedback(
          error instanceof Error
            ? error.message
            : 'Service cloud indisponible : demande impossible pour le moment.',
        );
      })
      .finally(() => setIsSendingRequest(false));
  };

  const submitIdentity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(undefined);
    setIdentityFeedback(undefined);

    void saveSocialIdentity(activeIdentityRepository, identity, {
      handle: identityHandle,
      displayName,
    })
      .then((result) => {
        setIdentityFeedback(result.message);
        if (result.status === 'saved') {
          setIdentity(result.identity);
          setIdentityHandle(formatSocialHandle(result.identity.handle));
          setDisplayName(result.identity.displayName);
        }
      })
      .catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'L’identité sociale n’a pas pu être enregistrée localement.',
        );
      });
  };

  const verifyAvailability = () => {
    setIsCheckingAvailability(true);
    setIdentityFeedback(undefined);

    void checkSocialHandleAvailability(activeLookupGateway, identityHandle)
      .then((result) => {
        setAvailability(result);
      })
      .catch((error) => {
        setAvailability({
          status: 'unavailable',
          message: error instanceof Error
            ? error.message
            : 'Compte cloud indisponible : disponibilité réelle impossible pour le moment.',
        });
      })
      .finally(() => setIsCheckingAvailability(false));
  };

  const copyIdentity = () => {
    const publicHandle = formatSocialHandle(identity.handle);
    if (!navigator.clipboard?.writeText) {
      setIdentityFeedback(`Identifiant à copier : ${publicHandle}`);
      return;
    }

    void navigator.clipboard.writeText(publicHandle)
      .then(() => setIdentityFeedback('Identifiant copié.'))
      .catch(() => setIdentityFeedback(`Identifiant à copier : ${publicHandle}`));
  };

  return (
    <section aria-labelledby="friends-title" className="min-w-0 space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Réseau privé
            </p>
            <h1
              id="friends-title"
              className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white"
            >
              Amis et confidentialité
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">
              Prépare ton identité publique, les invitations exactes et les limites de visibilité avant tout partage de performances.
            </p>
          </div>
          <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-900 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-100">
            {summary.friendCount} ami{summary.friendCount > 1 ? 's' : ''} · {summary.incomingPendingCount} demande{summary.incomingPendingCount > 1 ? 's' : ''} à valider · {summary.detailedPermissionCount} détail autorisé
          </div>
        </div>
      </div>

      <InlineNotice title="Partage contrôlé par défaut">
        <p>
          Les données détaillées restent privées. Chaque demande doit être acceptée et le partage d’activité reste désactivé tant que tu ne changes pas explicitement ce réglage.
        </p>
      </InlineNotice>

      <InlineNotice title="Garde-fou social actif">
        <p>{sharingGuard.reason}</p>
        <p>
          Aucun export social détaillé n’est disponible en 0.27.0 F3. Les permissions par ami sont stockées localement pour préparer les snapshots sociaux filtrés.
        </p>
      </InlineNotice>

      {isLoading ? (
        <InlineNotice title="Chargement local">
          <p className="inline-flex items-center gap-2">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Chargement des amis et de l’identité sociale enregistrés sur cet appareil.
          </p>
        </InlineNotice>
      ) : null}

      {errorMessage ? (
        <InlineNotice tone="error" title="Persistance locale indisponible">
          <p>{errorMessage}</p>
        </InlineNotice>
      ) : null}

      {snapshot.lastFeedback ? (
        <InlineNotice tone="success" title="Action prise en compte">
          <p>{snapshot.lastFeedback}</p>
        </InlineNotice>
      ) : null}

      {identityFeedback ? (
        <InlineNotice tone="success" title="Identité sociale">
          <p>{identityFeedback}</p>
        </InlineNotice>
      ) : null}

      {requestFeedback ? (
        <InlineNotice title="Recherche ami">
          <p>{requestFeedback}</p>
        </InlineNotice>
      ) : null}

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Mon identifiant SportPilot
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
              {formatSocialHandle(identity.handle)}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Le userId interne reste privé et stable. Les futures relations d’amitié seront rattachées au userId, pas au handle public.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={copyIdentity}>
            Copier mon identifiant
          </Button>
        </div>

        <form className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end" onSubmit={submitIdentity}>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="social-handle">
              Identifiant public
            </label>
            <input
              id="social-handle"
              value={identityHandle}
              onChange={(event) => {
                setIdentityHandle(event.target.value);
                setAvailability(initialAvailability);
              }}
              placeholder="ex. @alex.run"
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="social-display-name">
              Nom affiché
            </label>
            <input
              id="social-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="ex. Alex Run"
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <Button type="button" variant="secondary" onClick={verifyAvailability} disabled={isCheckingAvailability}>
              {isCheckingAvailability ? 'Vérification…' : 'Vérifier disponibilité'}
            </Button>
            <Button type="submit">
              Enregistrer
            </Button>
          </div>
        </form>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:text-slate-200">
            <p className="font-semibold text-slate-950 dark:text-white">
              {handleValidation.status === 'valid' ? 'Identifiant valide' : 'Identifiant invalide'}
            </p>
            <p>{handleValidation.message}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:text-slate-200">
            <p className="font-semibold text-slate-950 dark:text-white">
              Recherche exacte
            </p>
            <p>{availability.message}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            Utilisateur non connecté au cloud social : seule la sauvegarde locale est active pour l’instant.
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-100 p-3 text-brand-700 dark:bg-brand-950 dark:text-brand-200">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                Confidentialité
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Choisis ce qui peut être visible avant de connecter le partage social.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Visibilité du profil
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {visibilityOptions.map((option) => (
                  <Button
                    key={option}
                    variant={snapshot.privacy.profileVisibility === option ? 'primary' : 'secondary'}
                    onClick={() => update((actions) => actions.setProfileVisibility(option))}
                    aria-pressed={snapshot.privacy.profileVisibility === option}
                  >
                    {FRIEND_PROFILE_VISIBILITY_LABELS[option]}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Partage d’activité
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {sharingOptions.map((option) => (
                  <Button
                    key={option}
                    variant={snapshot.privacy.activitySharing === option ? 'primary' : 'secondary'}
                    onClick={() => update((actions) => actions.setActivitySharing(option))}
                    aria-pressed={snapshot.privacy.activitySharing === option}
                    disabled={snapshot.privacy.profileVisibility === 'private' && option !== 'disabled'}
                  >
                    {FRIEND_ACTIVITY_SHARING_LABELS[option]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-950 dark:text-white">
                    Demandes d’amis
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {snapshot.privacy.allowFriendRequests
                      ? 'Les invitations entrantes sont autorisées.'
                      : 'Les nouvelles invitations sont bloquées.'}
                  </p>
                </div>
                <Button
                  variant={snapshot.privacy.allowFriendRequests ? 'primary' : 'secondary'}
                  onClick={() => update((actions) => actions.setRequestsOpen(!snapshot.privacy.allowFriendRequests))}
                >
                  {snapshot.privacy.allowFriendRequests ? 'Ouvertes' : 'Bloquées'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <UserPlus aria-hidden="true" className="size-5 text-brand-700 dark:text-brand-300" />
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">
              Envoyer une invitation
            </h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            La demande passe par une recherche exacte d’identifiant SportPilot. Sans backend social branché, le service retourne clairement que la recherche réelle est indisponible.
          </p>

          <form className="mt-5 space-y-3" onSubmit={submitRequest}>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="friend-handle">
              Identifiant SportPilot
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="friend-handle"
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                placeholder="ex. @lea.cardio"
                className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <Button type="submit" disabled={isSendingRequest}>
                <Send aria-hidden="true" className="size-4" />
                {isSendingRequest ? 'Recherche…' : 'Envoyer'}
              </Button>
            </div>
          </form>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            Aucune performance détaillée n’est partagée depuis ce formulaire. Il prépare seulement la demande d’ami et le consentement futur.
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <UsersRound aria-hidden="true" className="size-5 text-brand-700 dark:text-brand-300" />
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">
              Amis connectés
            </h2>
          </div>
          <div className="mt-4 space-y-3">
            {snapshot.friends.length === 0 ? (
              <p className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                Aucun ami enregistré sur cet appareil pour le moment.
              </p>
            ) : snapshot.friends.map((friend) => {
              const friendSharingGuard = evaluateFriendScopedActivitySharingGuard(snapshot, friend);

              return (
                <div
                  key={friend.id}
                  className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-200">
                        {friend.initials}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-950 dark:text-white">{friend.displayName}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">@{friend.handle}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Permission : {FRIEND_ACTIVITY_PERMISSION_LABELS[friendSharingGuard.permission.sharingLevel]}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                      <Button
                        size="sm"
                        variant={friendSharingGuard.permission.sharingLevel === 'summary' ? 'primary' : 'secondary'}
                        onClick={() => update((actions) => actions.setFriendActivityPermission(friend.id, 'summary'))}
                        aria-pressed={friendSharingGuard.permission.sharingLevel === 'summary'}
                      >
                        Résumé uniquement
                      </Button>
                      <Button
                        size="sm"
                        variant={friendSharingGuard.permission.sharingLevel === 'detailed' ? 'primary' : 'secondary'}
                        onClick={() => update((actions) => actions.setFriendActivityPermission(friend.id, 'detailed'))}
                        aria-pressed={friendSharingGuard.permission.sharingLevel === 'detailed'}
                        disabled={snapshot.privacy.activitySharing !== 'detailed'}
                      >
                        Autoriser le détail
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                    {friendSharingGuard.reason}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <LockKeyhole aria-hidden="true" className="size-5 text-brand-700 dark:text-brand-300" />
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">
              Demandes
            </h2>
          </div>

          <div className="mt-4 space-y-3">
            {[...incomingRequests, ...outgoingRequests].length === 0 ? (
              <p className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                Aucune demande locale enregistrée.
              </p>
            ) : [...incomingRequests, ...outgoingRequests].map((request) => (
              <div
                key={request.id}
                className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-white">{request.displayName}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      @{request.handle} · {formatRequestDate(request.requestedAt)} · {requestStatusLabel(request)}
                    </p>
                  </div>
                  {request.direction === 'incoming' && request.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => update((actions) => actions.acceptRequest(request.id))}>
                        <Check aria-hidden="true" className="size-4" />
                        Accepter
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => update((actions) => actions.declineRequest(request.id))}>
                        <X aria-hidden="true" className="size-4" />
                        Refuser
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
