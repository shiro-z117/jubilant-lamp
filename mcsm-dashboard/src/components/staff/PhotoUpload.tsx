"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Image from "next/image";

type Photo = { name: string; url: string };

function Slot({ label }: { label: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(
    () => () => photos.forEach((p) => URL.revokeObjectURL(p.url)),
    [photos],
  );

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setPhotos((prev) => [
      ...prev,
      ...files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    ]);
    event.target.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={`photo-${label}`} className="font-medium">
        {label}
      </label>
      <input
        id={`photo-${label}`}
        type="file"
        accept="image/*"
        multiple
        onChange={onChange}
        className="text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
      />
      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <li key={p.url}>
              <Image
                src={p.url}
                alt={`${label}: ${p.name}`}
                width={200}
                height={200}
                unoptimized
                className="aspect-square w-full rounded-md object-cover"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PhotoUpload() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Slot label="Before" />
        <Slot label="After" />
      </div>
    </div>
  );
}
