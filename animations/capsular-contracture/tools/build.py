"""Собирает одностраничную версию: скрипты из js/ встраиваются в HTML (для публикации одним файлом)."""
import pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')
def inline(m):
    src = (root / m.group(1)).read_text(encoding='utf-8')
    assert '</script' not in src
    return '<script>\n' + src + '\n</script>'
out = re.sub(r'<script src="(js/[^"]+)"></script>', inline, html)
dist = root / 'dist'
dist.mkdir(exist_ok=True)
(dist / 'capsular-contracture.html').write_text(out, encoding='utf-8')
print('dist/capsular-contracture.html', len(out.encode('utf-8')), 'bytes')
