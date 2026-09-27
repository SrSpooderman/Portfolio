"""Convert stored documents to primitive blocks before removing the old renderers."""
from copy import deepcopy
from uuid import uuid4

BLOCK_TYPES = {'Grid', 'Container', 'Heading', 'Paragraph', 'Photo', 'Button', 'Spacer', 'Section'}
RETIRED_TYPES = {'Hero', 'About', 'Projects', 'Text', 'Skills', 'Contact', 'Image', 'CTA', 'Decoration'}


def node(kind, **props):
    return {'type': kind, 'props': {'id': f'{kind}-{uuid4()}', **props}}


def migrate_block(block):
    result = deepcopy(block)
    kind, props = result.get('type'), result.get('props', {})
    if kind in ('Grid', 'Container', 'Section'):
        props['content'] = [migrate_block(child) for child in props.get('content', [])]
        return result
    if kind not in RETIRED_TYPES:
        return result

    def heading(value, level='h2'):
        return node('Heading', text=value or '', level=level)

    def paragraph(value):
        return node('Paragraph', text=value or '')

    def button(label, url):
        return node('Button', label=label or 'Enlace', url=url or '#', radius=30)

    content, anchor = [], props.get('anchor')
    if kind == 'Hero':
        content = [paragraph(props.get('eyebrow')), heading(props.get('title'), 'h1'),
                   paragraph(props.get('description')), button(props.get('button'), props.get('link'))]
    elif kind == 'About':
        anchor = anchor or 'sobre-mi'
        content = [heading(props.get('title')), paragraph(props.get('description')), paragraph(props.get('detail'))]
    elif kind == 'Text':
        content = [heading(props.get('title')), paragraph(props.get('text'))]
    elif kind == 'Contact':
        anchor = anchor or 'contacto'
        email = props.get('email', '')
        content = [heading(props.get('title')), paragraph(props.get('text')), button(email, f'mailto:{email}')]
    elif kind == 'CTA':
        content = [heading(props.get('title')), button(props.get('label'), props.get('url'))]
    elif kind == 'Image':
        content = [node('Photo', src=props.get('src', ''), alt=props.get('alt', ''), height=0, fit='contain'),
                   paragraph(props.get('caption'))]
    elif kind in ('Projects', 'Skills'):
        anchor = anchor or ('proyectos' if kind == 'Projects' else 'servicios')
        cards = []
        for item in props.get('items', []):
            children = []
            # Keep real uploaded images; generated decorative mockups are retired.
            if item.get('image'):
                children.append(node('Photo', src=item['image'], alt=item.get('title', ''), height=240))
            children.append(heading(item.get('title'), 'h3'))
            if item.get('category'):
                children.append(paragraph(item['category']))
            children.append(paragraph(item.get('description')))
            if item.get('url'):
                children.append(button('Ver proyecto', item['url']))
            appearance = {'padding': 24}
            if item.get('color'):
                appearance['background'] = item['color']
            cards.append(node('Container', content=children, gap=16, appearance=appearance))
        content = [heading(props.get('title')), node('Grid', columns=3, mobileColumns=1, gap=24, content=cards)]
    elif kind == 'Decoration':
        result = node('Spacer', height=0)

    if kind != 'Decoration':
        result = node('Container', content=content, direction='column', gap=20,
                      appearance={'padding': 48}, mobile={'padding': 24})
    target = result['props']
    for key in ('id', 'placement'):
        if key in props:
            target[key] = deepcopy(props[key])
    for key in ('appearance', 'mobile'):
        target[key] = {**target.get(key, {}), **props.get(key, {})}
    if anchor:
        target['anchor'] = anchor
    return result


def migrate_document(document):
    result = deepcopy(document)
    result['content'] = [migrate_block(block) for block in result.get('content', [])]
    # Old DropZone documents may also keep their children in named zones.
    if isinstance(result.get('zones'), dict):
        result['zones'] = {key: [migrate_block(block) for block in blocks]
                           for key, blocks in result['zones'].items()}
    return result


def populate_starter(document, profile):
    result = deepcopy(document)

    def walk(block):
        props = block['props']
        binding = props.pop('binding', None)
        if binding == 'email':
            props.update(label=profile['email'], url=f"mailto:{profile['email']}")
        elif binding:
            props['text'] = profile.get(binding, '')
        for child in props.get('content', []):
            walk(child)

    for block in result['content']:
        walk(block)
    result.get('root', {}).get('props', {}).pop('starter', None)
    return result
