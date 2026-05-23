from __future__ import annotations


def buildOmniPrompt(user_context: dict) -> str:
    full_name = user_context.get('fullName', '')
    workspace = user_context.get('workspaceName', '')
    industry = user_context.get('industry', '')
    region = user_context.get('region', '')
    target_age = user_context.get('targetAge', '')
    target_gender = user_context.get('targetGender', '')
    sales_channel = user_context.get('salesChannel') or user_context.get('marketplace', '')
    product_name = user_context.get('productName', '')
    product_desc = user_context.get('productDescription', '')
    pain_point = user_context.get('painPoint') or user_context.get('problemToSolve', '')
    price_min = user_context.get('priceRangeMin', '')
    price_max = user_context.get('priceRangeMax', '')
    keywords = user_context.get('searchIntentKeywords') or user_context.get('researchGoals', [])
    unique_sp = user_context.get('uniqueSellingPoint', '')
    competitors = user_context.get('competitors', [])

    lines: list[str] = []

    founder = f'{full_name} at {workspace}' if full_name and workspace else workspace or full_name or 'this founder'
    lines.append(f'You are a dedicated market intelligence agent for {founder}.')

    if industry:
        lines.append(f'Industry: {industry}')
    if region:
        lines.append(f'Target Region: {region}')

    target_parts = [p for p in [target_gender, target_age] if p]
    if target_parts:
        lines.append(f'Target Customer: {", ".join(target_parts)}')

    if sales_channel:
        lines.append(f'Sales Channel: {sales_channel}')
    if product_name:
        lines.append(f'Product: {product_name}')
    if product_desc:
        lines.append(f'Description: {product_desc}')
    if pain_point:
        lines.append(f'Core Problem Being Solved: {pain_point}')
    if unique_sp:
        lines.append(f'Unique Selling Point: {unique_sp}')
    if price_min or price_max:
        lines.append(f'Price Range: {price_min} – {price_max}')
    if keywords:
        kw = ', '.join(keywords) if isinstance(keywords, list) else str(keywords)
        lines.append(f'Research Keywords: {kw}')
    if competitors and isinstance(competitors, list) and len(competitors) > 0:
        lines.append(f'Known Competitors: {", ".join(competitors)}')

    context_block = '\n'.join(lines)

    subject = workspace or industry or 'this business'
    kw_hint = (', '.join(keywords[:3]) if isinstance(keywords, list) and keywords else industry) or 'relevant topics'

    return f'''\
FOUNDER CONTEXT:
{context_block}

Always prioritize insights relevant to {subject}. Use the research keywords ({kw_hint}) and \
industry context to focus searches. Ground every analysis in the founder's actual business \
context — not generic advice.\
'''
