"""Generate printable QR images; keep all labels outside the QR quiet zone."""
from pathlib import Path
import qrcode
from PIL import Image, ImageDraw, ImageFont

output = Path(__file__).resolve().parents[1] / 'images'
output.mkdir(exist_ok=True)
for action in ('in', 'out'):
    url = f'https://porkchop.mipi.support/check-{action}'
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=20, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    code = qr.make_image(fill_color='black', back_color='white').convert('RGB')
    canvas = Image.new('RGB', (code.width, code.height + 180), 'white')
    canvas.paste(code, (0, 100))
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype('DejaVuSans-Bold.ttf', 42)
    small = ImageFont.truetype('DejaVuSans.ttf', 24)
    draw.text((code.width / 2, 24), f'GARAGEMAHAL • CHECK {action.upper()}', font=font, fill='black', anchor='mt')
    draw.text((code.width / 2, code.height + 120), url, font=small, fill='black', anchor='mt')
    canvas.save(output / f'check-{action}.png')
