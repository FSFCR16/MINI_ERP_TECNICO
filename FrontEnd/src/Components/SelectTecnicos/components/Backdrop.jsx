"use client";

export function Backdrop({ onClick }) {
  return (
    <button
      type="button"
      aria-label="Cerrar lista"
      onClick={onClick}
      className="fixed inset-0 z-20 cursor-default bg-transparent"
    />
  );
}