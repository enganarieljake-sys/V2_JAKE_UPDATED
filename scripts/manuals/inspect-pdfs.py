"""Requires PyMuPDF in the documentation tooling environment, not the app."""
import json
from pathlib import Path
import fitz

root = Path(__file__).resolve().parents[2]
output = root / 'docs' / 'manuals'
results = []
for name, language in [('English', 'en'), ('Bisaya', 'ceb'), ('Tagalog', 'fil')]:
    path = root / 'backend-api' / 'public' / 'manuals' / f'VMS_User_Manual_{name}.pdf'
    document = fitz.open(path)
    text = '\n'.join(page.get_text() for page in document)
    page_info = []
    for index, page in enumerate(document):
        blocks = page.get_text('blocks')
        page_info.append({'page': index + 1, 'textCharacters': len(page.get_text()), 'images': len(page.get_images()), 'links': len(page.get_links())})
        assert len(page.get_text().strip()) > 15, f'Blank page: {name}/{index + 1}'
        assert abs(page.rect.width - 595.28) < 2 and abs(page.rect.height - 841.89) < 2, 'Non-A4 page'
        for block in blocks:
            if len(block) > 6 and block[6] == 0:
                assert block[0] >= -1 and block[2] <= page.rect.width + 1 and block[3] <= page.rect.height + 1, f'Clipped text: {name}/{index + 1}'
    for role in ['Administrator', 'Custodian', 'Maintenance Personnel']:
        assert role in text, f'Missing role: {name}/{role}'
    assert sum(p['images'] > 0 for p in page_info) >= 23, f'Missing screenshots: {name}'
    for index in [0, 1, 4, 5, 18, 19, 28, 29, len(document) - 1]:
        document[index].get_pixmap(matrix=fitz.Matrix(1.25, 1.25)).save(output / f'pdf-{language}-{index + 1}.png')
    results.append({'language': language, 'pages': len(document), 'bytes': path.stat().st_size, 'a4': True, 'rolesPresent': True, 'screenshotPages': sum(p['images'] > 0 for p in page_info), 'clickableLinks': sum(p['links'] for p in page_info), 'noBlankPagesOrClippedText': True, 'pageDetails': page_info})
(output / 'pdf-verification.json').write_text(json.dumps(results, indent=2), encoding='utf8')
print(json.dumps([{key: value for key, value in result.items() if key != 'pageDetails'} for result in results]))
