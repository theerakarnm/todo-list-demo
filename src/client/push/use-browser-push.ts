import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { pushSubscriptionSchema } from "../../shared/schemas/push";
import { api } from "../api/client";
import { readJson, throwIfFailed } from "../api/request-error";
import { currentPushEnvironment, pushSupport } from "./push-support";

const SUBSCRIPTION_KEY = ["push-subscription"] as const;

/** The user said no (now or earlier). Not an error to report: the screen explains it. */
class PermissionDenied extends Error {}

async function registration() {
  const found = await navigator.serviceWorker.getRegistration();
  if (!found) throw new Error("The service worker is not registered");
  // subscribe() needs an active worker; a fresh install may still be starting.
  return navigator.serviceWorker.ready;
}

/** The server's VAPID public key, base64url, as the bytes pushManager.subscribe wants. */
function keyBytes(base64Url: string) {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

async function subscribeThisDevice() {
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") throw new PermissionDenied();

  const worker = await registration();
  const { publicKey } = await readJson(await api.api.push["public-key"].$get());
  const subscription = await worker.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes(publicKey),
  });
  try {
    await throwIfFailed(await api.api.push.subscribe.$post({ json: pushSubscriptionSchema.parse(subscription.toJSON()) }));
  } catch (error) {
    // The server does not know this device, so the browser must not keep a subscription either.
    await subscription.unsubscribe();
    throw error;
  }
}

async function unsubscribeThisDevice() {
  const subscription = await (await registration()).pushManager.getSubscription();
  if (!subscription) return;
  // The server first: if it fails, nothing has changed yet and the switch can stay on.
  await throwIfFailed(await api.api.push.subscribe.$delete({ json: { endpoint: subscription.endpoint } }));
  await subscription.unsubscribe();
}

/** Whether this device can get push and has a subscription, and the way to turn that on or off. */
export function useBrowserPush(onFailed: (turningOn: boolean) => void) {
  const queryClient = useQueryClient();
  // The device does not change while the page is open.
  const [support] = useState(() => pushSupport(currentPushEnvironment()));

  const subscribed = useQuery({
    queryKey: SUBSCRIPTION_KEY,
    enabled: support === "ready",
    queryFn: async () => {
      const worker = await navigator.serviceWorker.getRegistration();
      return (await worker?.pushManager.getSubscription()) != null;
    },
  });

  const change = useMutation({
    mutationFn: async (turnOn: boolean) => (turnOn ? subscribeThisDevice() : unsubscribeThisDevice()),
    onSuccess: (_result, turnOn) => queryClient.setQueryData(SUBSCRIPTION_KEY, turnOn),
    onError: (error, turnOn) => {
      if (!(error instanceof PermissionDenied)) onFailed(turnOn);
    },
  });

  return {
    support,
    // While a change is on its way the switch already shows the wanted state.
    on: change.isPending ? change.variables : (subscribed.data ?? false),
    denied: support === "ready" && Notification.permission === "denied",
    turn: change.mutate,
  };
}
