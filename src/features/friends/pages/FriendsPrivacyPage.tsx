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
import {
  FRIEND_ACTIVITY_SHARING_LABELS,
  FRIEND_PROFILE_VISIBILITY_LABELS,
  evaluateFriendActivitySharingGuard,
  summarizeFriendsPrivacy,
  type FriendActivitySharingLevel,
  type FriendRequest,
  type FriendsPrivacySnapshot,
  type FriendVisibilityLevel,
} from '@/domain/friends/friendship';
import { appDatabase } from '@/infrastructure/database/database';
import { DexieFriendsPrivacyRepository } from '@/infrastructure/repositories/dexie/DexieFriendsPrivacyRepository';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface FriendsPrivacyPageProps {
  readonly initialSnapshot?: FriendsPrivacySnapshot;
  readonly repository?: FriendsPrivacySnapshotRepository;
}

const visibilityOptions: readonly FriendVisibilityLevel[] = ['private', 'friends', 'public'];
const sharingOptions: readonly FriendActivitySharingLevel[] = ['disabled', 'summary-only', 'detailed'];

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
}: FriendsPrivacyPageProps = {}) {
  const [defaultRepository] = useState(() =>
    initialSnapshot ? undefined : new DexieFriendsPrivacyRepository(appDatabase),
  );
  const activeRepository = repository ?? defaultRepository;
  const [snapshot, setSnapshot] = useState<FriendsPrivacyServiceState>(() =>
    initialSnapshot ?? createEmptyFriendsPrivacySnapshot(),
  );
  const [handle, setHandle] = useState('');
  const [isLoading, setIsLoading] = useState(() => Boolean(activeRepository && !initialSnapshot));
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    if (!activeRepository || initialSnapshot) return undefined;

    let active = true;
    setIsLoading(true);
    setErrorMessage(undefined);

    void loadFriendsPrivacySnapshot(activeRepository)
      .then((loaded) => {
        if (active) setSnapshot(loaded);
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
  }, [activeRepository, initialSnapshot]);

  const summary = useMemo(() => summarizeFriendsPrivacy(snapshot), [snapshot]);
  const sharingGuard = useMemo(() => evaluateFriendActivitySharingGuard(snapshot), [snapshot]);
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
    const service = createFriendsPrivacyService(snapshot);
    const next = service.actions.sendRequest(handle);
    persistSnapshot(next);
    if (next.lastFeedback?.startsWith('Demande envoyée')) {
      setHandle('');
    }
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
              Prépare les invitations, les validations manuelles et les limites de visibilité avant tout partage de performances.
            </p>
          </div>
          <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-900 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-100">
            {summary.friendCount} ami{summary.friendCount > 1 ? 's' : ''} · {summary.incomingPendingCount} demande{summary.incomingPendingCount > 1 ? 's' : ''} à valider
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
          Aucun export social détaillé n’est disponible en 0.26.0. Le partage restera limité à un résumé tant que le consentement par ami n’est pas livré.
        </p>
      </InlineNotice>

      {isLoading ? (
        <InlineNotice title="Chargement local">
          <p className="inline-flex items-center gap-2">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Chargement des amis enregistrés sur cet appareil.
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
            Les demandes restent locales pour cette phase. La synchronisation entre comptes sera activée plus tard.
          </p>

          <form className="mt-5 space-y-3" onSubmit={submitRequest}>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="friend-handle">
              Identifiant ami
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="friend-handle"
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                placeholder="ex. lea.cardio"
                className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <Button type="submit">
                <Send aria-hidden="true" className="size-4" />
                Envoyer
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
            ) : snapshot.friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-200">
                    {friend.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-white">{friend.displayName}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">@{friend.handle}</p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  Ami
                </span>
              </div>
            ))}
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
