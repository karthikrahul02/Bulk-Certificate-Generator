from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


PAGE_SIZE = (1600, 1120)


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/georgiab.ttf" if bold else "C:/Windows/Fonts/georgia.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _center(draw: ImageDraw.ImageDraw, text: str, y: int, font: ImageFont.ImageFont, fill: str) -> None:
    box = draw.textbbox((0, 0), text, font=font)
    x = (PAGE_SIZE[0] - (box[2] - box[0])) // 2
    draw.text((x, y), text, font=font, fill=fill)


def generate_certificate_png(
    *,
    recipient_name: str,
    event_name: str,
    issued_on: str,
    output_path: Path,
    course_name: str | None = None,
    certificate_title: str | None = None,
) -> None:
    if recipient_name.strip().upper() == "FAIL_CERTIFICATE":
        raise RuntimeError("Simulated renderer failure for deterministic failure handling tests")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", PAGE_SIZE, "#f8f5ed")
    draw = ImageDraw.Draw(img)

    draw.rounded_rectangle((55, 55, 1545, 1065), radius=18, outline="#1f2a44", width=8)
    draw.rounded_rectangle((92, 92, 1508, 1028), radius=12, outline="#c69c4f", width=4)
    draw.rectangle((128, 128, 1472, 992), outline="#e0d2af", width=2)

    _center(draw, certificate_title or "Certificate of Completion", 210, _font(76, True), "#1f2a44")
    _center(draw, "Presented to", 350, _font(34), "#6b5f45")
    _center(draw, recipient_name.strip(), 420, _font(82, True), "#121826")

    descriptor = f"for successfully participating in {event_name.strip()}"
    if course_name:
        descriptor += f" - {course_name.strip()}"
    _center(draw, descriptor, 560, _font(34), "#334155")
    _center(draw, f"Issued on {issued_on.strip()}", 635, _font(30), "#6b7280")

    draw.line((360, 820, 640, 820), fill="#1f2a44", width=3)
    draw.line((960, 820, 1240, 820), fill="#1f2a44", width=3)
    _center(draw, "Program Director", 845, _font(24), "#1f2a44")
    _center(draw, "Certificate Registry", 895, _font(24), "#1f2a44")

    img.save(output_path, "PNG")
