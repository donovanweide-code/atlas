from __future__ import annotations

from typing import Any

from reportlab.lib import colors


LOGO_ASPECT_RATIO = 118 / 43


def _draw_tracked_text(
    canvas: Any,
    text: str,
    x: float,
    y: float,
    font_name: str,
    font_size: float,
    tracking: float,
) -> None:
    text_object = canvas.beginText(x, y)
    text_object.setFont(font_name, font_size)
    text_object.setCharSpace(tracking)
    text_object.textOut(text)
    canvas.drawText(text_object)


def draw_wbd_logo(
    canvas: Any,
    x: float,
    y: float,
    width: float,
    fonts: tuple[str, str, str, str],
    color: colors.Color,
) -> None:
    """Draw the official current WBD lock-up as a reusable vector component.

    The geometry follows the current public brand component: the serif W / BD
    mark and the tracked full company name below it. The supplied ``x`` and
    ``y`` coordinates describe the bottom-left corner of the complete lock-up.
    """

    serif, _serif_bold, _sans, sans_bold = fonts
    scale = width / 118

    canvas.saveState()
    canvas.translate(x, y)
    canvas.scale(scale, scale)
    canvas.setFillColor(color)
    canvas.setStrokeColor(color)

    canvas.setFont(serif, 21)
    canvas.drawString(0, 21, "W")

    canvas.setLineWidth(0.75)
    canvas.setStrokeAlpha(0.48)
    canvas.line(27, 18, 34.5, 38)
    canvas.setStrokeAlpha(1)

    canvas.setFont(serif, 8.8)
    canvas.drawString(36.5, 17.5, "BD")

    _draw_tracked_text(
        canvas,
        "WE BUILD AND DESIGN",
        0,
        2.5,
        sans_bold,
        6.8,
        1.05,
    )
    canvas.restoreState()
