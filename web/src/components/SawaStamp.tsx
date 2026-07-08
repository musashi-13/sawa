// The 沢 mark as a warm, glowing hanko-style seal — used in the nav bar and
// echoed by the sign-in sheet.
export function SawaStamp({ size = 30 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-[9px] font-medium leading-none text-[#F3ECDD]"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.6),
        background: "linear-gradient(150deg,#CE6A46,#9E4328)",
        boxShadow:
          "0 6px 16px -7px rgba(201,100,66,0.8), inset 0 0 0 1px rgba(255,240,225,0.15)",
      }}
    >
      沢
    </span>
  );
}
