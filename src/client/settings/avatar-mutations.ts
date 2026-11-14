import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { apiErrorMessage } from "../api/error-message";
import { readJson } from "../api/request-error";
import { uploadForm } from "../api/upload";
import { meQuery } from "../auth/use-me";
import { AVATAR_UPLOAD_ID, endLocalUpload, startLocalUpload } from "../data/local-uploads";
import { isImageFile, prepareAvatar } from "../images/prepare-image";
import { useToast } from "../toast/ToastProvider";

type AvatarResult = { avatarKey: string | null };

function useSetAvatarKey() {
  const queryClient = useQueryClient();
  return (avatarKey: string | null) =>
    queryClient.setQueryData(meQuery.queryKey, (me) => me && { ...me, settings: { ...me.settings, avatarKey } });
}

function useShowError() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  return (error: unknown) => showToast({ tone: "error", message: apiErrorMessage(t, error) });
}

/** "เปลี่ยนรูป": shows the picked photo at once, crops it to a 512 px square and uploads it. */
export function useChangeAvatar() {
  const setAvatarKey = useSetAvatarKey();
  const showError = useShowError();

  const change = useMutation({
    mutationFn: async (file: File) => {
      const photo = await prepareAvatar(file);
      const form = new FormData();
      form.append("file", photo.blob);
      return uploadForm<AvatarResult>("PUT", "/api/me/avatar", form);
    },
    // A file that is not an image gets no preview; prepareAvatar refuses it with a toast.
    onMutate: (file) => isImageFile(file) && startLocalUpload(AVATAR_UPLOAD_ID, file),
    onSuccess: ({ avatarKey }) => setAvatarKey(avatarKey),
    onError: showError,
    onSettled: () => endLocalUpload(AVATAR_UPLOAD_ID),
  });
  return (file: File) => change.mutate(file);
}

/** "ลบรูป": back to the LINE picture or the initial at once; the old photo returns if it fails. */
export function useRemoveAvatar() {
  const queryClient = useQueryClient();
  const setAvatarKey = useSetAvatarKey();
  const showError = useShowError();

  const remove = useMutation({
    mutationFn: async () => readJson(await api.api.me.avatar.$delete()),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: meQuery.queryKey });
      const previous = queryClient.getQueryData(meQuery.queryKey)?.settings.avatarKey ?? null;
      setAvatarKey(null);
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) setAvatarKey(context.previous);
      showError(error);
    },
  });
  return () => remove.mutate();
}
