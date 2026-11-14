import { describe, expect, it } from "vitest";
import { sniffImageMime } from "./sniff-image";

const ascii = (text: string) => Array.from(text, (char) => char.charCodeAt(0));
const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((part) => (typeof part === "string" ? ascii(part) : part)));

/** The start of an ISO-BMFF file: a 24-byte `ftyp` box with this major brand. */
const isoBmff = (majorBrand: string) => bytes([0, 0, 0, 24], "ftyp", majorBrand, [0, 0, 0, 0], "mif1", "miaf");

describe("sniffImageMime", () => {
  it("recognises JPEG, PNG and WebP by their first bytes", () => {
    expect(sniffImageMime(bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0x10], "JFIF"))).toBe("image/jpeg");
    expect(sniffImageMime(bytes([0x89], "PNG", [0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d], "IHDR"))).toBe("image/png");
    expect(sniffImageMime(bytes("RIFF", [0x24, 0x10, 0, 0], "WEBPVP8 "))).toBe("image/webp");
  });

  it("recognises HEIC and HEIF by the major brand of the ftyp box", () => {
    for (const brand of ["heic", "heix", "hevc", "hevx", "heim", "heis"]) {
      expect(sniffImageMime(isoBmff(brand))).toBe("image/heic");
    }
    for (const brand of ["mif1", "msf1"]) {
      expect(sniffImageMime(isoBmff(brand))).toBe("image/heif");
    }
  });

  it("rejects other ISO-BMFF files such as MP4 video and AVIF", () => {
    expect(sniffImageMime(isoBmff("isom"))).toBeNull();
    expect(sniffImageMime(isoBmff("avif"))).toBeNull();
  });

  it("rejects a program renamed to .jpg", () => {
    expect(sniffImageMime(bytes("MZ", [0x90, 0, 0x03, 0, 0, 0, 0x04, 0, 0, 0, 0xff, 0xff]))).toBeNull();
  });

  it("rejects a RIFF file that is not WebP, and files too short to tell", () => {
    expect(sniffImageMime(bytes("RIFF", [0x24, 0x10, 0, 0], "WAVEfmt "))).toBeNull();
    expect(sniffImageMime(bytes([0xff, 0xd8]))).toBeNull();
    expect(sniffImageMime(new Uint8Array())).toBeNull();
  });
});
