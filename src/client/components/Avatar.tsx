import { useState } from "react";
import type { Me } from "../auth/use-me";
import { AVATAR_UPLOAD_ID, useLocalUpload } from "../data/local-uploads";
import { fileUrl } from "../images/file-url";

type AvatarProps = {
  me: Me | null | undefined;
  /** "large" is the 80 px photo in Settings; the sidebar uses the small one. */
  size?: "small" | "large";
  /** Text for the photo; leave out where the name is shown next to it. */
  alt?: string;
};

/** The photo that shows: a new one on its way, the uploaded one, else the LINE picture. */
function usePhotoUrl(me: AvatarProps["me"]) {
  const upload = useLocalUpload(AVATAR_UPLOAD_ID);
  if (upload) return upload.previewUrl;
  if (me?.settings.avatarKey) return fileUrl(me.settings.avatarKey);
  return me?.user.image ?? null;
}

/** The user's profile photo, or the first letter of their name when there is none. */
export function Avatar({ me, size = "small", alt = "" }: AvatarProps) {
  const photoUrl = usePhotoUrl(me);
  // A photo that does not load (an expired LINE link) falls back to the letter.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initial = [...(me?.settings.displayName ?? "")][0];
  const className = size === "large" ? "avatar avatar-large" : "avatar";

  if (photoUrl && photoUrl !== failedUrl) {
    return (
      <span className={className}>
        <img src={photoUrl} alt={alt} onError={() => setFailedUrl(photoUrl)} />
      </span>
    );
  }
  return (
    <span className={className} aria-hidden="true">
      {initial}
    </span>
  );
}
