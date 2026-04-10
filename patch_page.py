path = '/Users/jyekkot/Desktop/kkotium-garden/src/app/products/new/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# Find the image section start and end precisely
start = content.find('<Field label="\ub300\ud45c \uc774\ubbf8\uc9c0 URL"')
# End marker: the Field containing seoHook textarea (the next Field after image fields)
end_markers = [
    '<Field label="SEO \ud6c8\ubb38\uad6c"',
    'value={seoHook}',
]
end = -1
for em in end_markers:
    idx = content.find(em, start)
    if idx > 0:
        # Walk back to find opening of this Field
        field_start = content.rfind('<Field', start, idx)
        if field_start > 0:
            end = field_start
            print(f'End found via "{em}" at {field_start}')
            break

if start < 0:
    print('START not found')
elif end < 0:
    print('END not found')
else:
    old_block = content[start:end]
    print('Old block length:', len(old_block))
    print('Old block preview:', repr(old_block[:120]))

    new_block = (
        '{/* Drag-and-drop image upload to Supabase — auto URL — Excel cols 18/19/20 */}\n'
        '              <ImageUploadDropzone\n'
        '                type="main"\n'
        '                label="\ub300\ud45c \uc774\ubbf8\uc9c0"\n'
        '                hint="\ucd5c\uc18c 500x500px \u00b7 1\uc7a5 \u00b7 \uc5d1\uc140 \ucee8\ub7fc 18"\n'
        '                required\n'
        '                value={mainImage}\n'
        '                onChange={setMainImage}\n'
        '              />\n'
        '              <ImageUploadDropzone\n'
        '                type="additional"\n'
        '                label="\ucd94\uac00 \uc774\ubbf8\uc9c0"\n'
        '                hint="\ucd5c\ub300 9\uc7a5 \u00b7 \uc5d1\uc140 \ucee8\ub7fc 19"\n'
        '                value={additionalImages}\n'
        '                onChange={setAdditionalImages}\n'
        '                maxFiles={9}\n'
        '              />\n'
        '              <ImageUploadDropzone\n'
        '                type="detail"\n'
        '                label="\uc0c1\uc138\ud398\uc774\uc9c0 \uc774\ubbf8\uc9c0"\n'
        '                hint="\uc5d1\uc140 \ucee8\ub7fc 20 \uc0bd\uc785 (\uc0c1\uc138\uc124\uba85 \ud544\ub4dc)"\n'
        '                value={detailImageUrl}\n'
        '                onChange={setDetailImageUrl}\n'
        '              />\n'
        '              '
    )

    content = content[:start] + new_block + content[end:]
    with open(path, 'w') as f:
        f.write(content)
    print('REPLACED OK')
