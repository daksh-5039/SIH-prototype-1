from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.lib.colors import HexColor
from pathlib import Path

OUT = Path(r"C:\Users\dwive\OneDrive\Desktop\SIH Prototype\output\pdf\TouriSense_SIH_Prototype_Website_Summary.pdf")
OUT.parent.mkdir(parents=True, exist_ok=True)

NAVY = HexColor('#16324F')
TEAL = HexColor('#007C83')
CORAL = HexColor('#F05D4E')
MINT = HexColor('#EAF7F6')
INK = HexColor('#1E293B')
MUTED = HexColor('#536273')
LINE = HexColor('#D9E3EA')
PALE = HexColor('#F7FAFC')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='CoverKicker', fontName='Helvetica-Bold', fontSize=10, leading=13, textColor=CORAL, spaceAfter=9, uppercase=True))
styles.add(ParagraphStyle(name='CoverTitle', fontName='Helvetica-Bold', fontSize=31, leading=35, textColor=NAVY, spaceAfter=12))
styles.add(ParagraphStyle(name='CoverSub', fontName='Helvetica', fontSize=14, leading=21, textColor=MUTED, spaceAfter=20))
styles.add(ParagraphStyle(name='H1Rahi', fontName='Helvetica-Bold', fontSize=21, leading=26, textColor=NAVY, spaceAfter=8))
styles.add(ParagraphStyle(name='H2Rahi', fontName='Helvetica-Bold', fontSize=12, leading=15, textColor=TEAL, spaceBefore=9, spaceAfter=5))
styles.add(ParagraphStyle(name='BodyRahi', fontName='Helvetica', fontSize=9.5, leading=14, textColor=INK, spaceAfter=6))
styles.add(ParagraphStyle(name='SmallRahi', fontName='Helvetica', fontSize=8, leading=11, textColor=MUTED))
styles.add(ParagraphStyle(name='CardTitle', fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=NAVY, spaceAfter=4))
styles.add(ParagraphStyle(name='CardBody', fontName='Helvetica', fontSize=8.7, leading=12.3, textColor=INK))
styles.add(ParagraphStyle(name='Callout', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=NAVY))
styles.add(ParagraphStyle(name='TableHead', fontName='Helvetica-Bold', fontSize=8.7, leading=12, textColor=colors.white))

def P(text, style='BodyRahi'):
    return Paragraph(text, styles[style])

def card(title, text, accent=TEAL):
    box = Table([[P(title, 'CardTitle')], [P(text, 'CardBody')]], colWidths=[82*mm])
    box.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),colors.white), ('BOX',(0,0),(-1,-1),0.55,LINE),
        ('LINEBEFORE',(0,0),(0,-1),3,accent), ('LEFTPADDING',(0,0),(-1,-1),8),
        ('RIGHTPADDING',(0,0),(-1,-1),8), ('TOPPADDING',(0,0),(-1,-1),7), ('BOTTOMPADDING',(0,0),(-1,-1),7),
    ]))
    return box

def two_cards(items):
    rows=[]
    for i in range(0,len(items),2):
        left=card(*items[i])
        right=card(*items[i+1]) if i+1<len(items) else Spacer(82*mm,1)
        rows.append([left,right])
    t=Table(rows, colWidths=[86*mm,86*mm], hAlign='LEFT')
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),4),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
    return t

def section_title(title, subtitle):
    return [P(title, 'H1Rahi'), P(subtitle, 'BodyRahi'), Spacer(1,4)]

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE); canvas.setLineWidth(.5)
    canvas.line(18*mm, 13*mm, A4[0]-18*mm, 13*mm)
    canvas.setFont('Helvetica', 7.5); canvas.setFillColor(MUTED)
    canvas.drawString(18*mm, 8*mm, 'TouriSense - SIH tourism prototype | Website feature summary')
    canvas.drawRightString(A4[0]-18*mm, 8*mm, f'Page {doc.page}')
    canvas.restoreState()

doc=SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=17*mm, bottomMargin=19*mm)
story=[]

# Cover
story += [Spacer(1,22*mm), P('SMART INDIA HACKATHON  |  TOURISM PROTOTYPE', 'CoverKicker'), P('TouriSense', 'CoverTitle'), P('One destination search that connects travel planning, crowd awareness, budget guidance and weather decisions.', 'CoverSub')]
cover_table=Table([
    [P('<b>Prototype purpose</b><br/>Help travellers make better trip decisions before booking or leaving - using a single, destination-aware experience.', 'BodyRahi'), P('<b>Core promise</b><br/>Search once. The selected destination carries through the planner, crowd, expense and weather tools.', 'BodyRahi')],
    [P('<b>Destination coverage</b><br/>Taj Mahal/Agra, Jaipur, Goa, Kerala Backwaters, Manali and Varanasi.', 'BodyRahi'), P('<b>Presentation note</b><br/>This document describes what is implemented in the website; use it as source material for your team PPT.', 'BodyRahi')]
], colWidths=[86*mm,86*mm])
cover_table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),MINT),('BOX',(0,0),(-1,-1),0.7,HexColor('#BCE4E1')),('INNERGRID',(0,0),(-1,-1),0.5,HexColor('#BCE4E1')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10)]))
story += [cover_table, Spacer(1,18*mm), P('Prepared from the completed TouriSense website implementation', 'SmallRahi')]
story.append(PageBreak())

# Overview
story += section_title('1. What TouriSense solves', 'TouriSense combines the trip questions that are usually spread across different apps into one connected travel-planning flow.')
story += [P('<b>Traveller challenge:</b> Before a trip, people need to decide where to go, how to reach it, when it will be crowded, what the weather means, and how much to spend. These answers are often disconnected and time-consuming to compare.'), P('<b>TouriSense approach:</b> A visitor searches or chooses a destination once. That choice is retained across the website, so every planning tool immediately shows relevant information.')]
story += [Spacer(1,3), two_cards([
    ('Destination discovery', 'Search suggestions and popular destination tags help a traveller select from six supported destinations. The home summary immediately shows best season, quietest hour, transport modes and current weather context.', TEAL),
    ('Connected journey', 'The chosen destination is stored locally and reused on all key pages, avoiding repetitive inputs and keeping the planning journey consistent.', CORAL),
    ('Decision support', 'TouriSense turns raw travel inputs into clear actions: visit at a quieter time, choose a travel option, adjust a budget, or go/wait/reroute based on conditions.', TEAL),
    ('Demo-ready scope', 'The prototype focuses on trip research and planning. It does not process payments, issue tickets, make hotel reservations or claim verified sensor-grade crowd data.', CORAL)
])]
story += [Spacer(1,5), P('End-to-end user flow', 'H2Rahi')]
flow=Table([[P('<b>1. Search</b><br/>Pick destination', 'CardBody'), P('<b>2. Review</b><br/>Quick trip snapshot', 'CardBody'), P('<b>3. Plan</b><br/>Transport + nearby places', 'CardBody'), P('<b>4. Decide</b><br/>Crowd, weather, budget', 'CardBody'), P('<b>5. Save</b><br/>Private account data', 'CardBody')]], colWidths=[34.4*mm]*5)
flow.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('BOX',(0,0),(-1,-1),.6,LINE),('INNERGRID',(0,0),(-1,-1),.6,LINE),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('ALIGN',(0,0),(-1,-1),'CENTER'),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
story += [flow, PageBreak()]

# Main feature pages
story += section_title('2. Main website features', 'The home page presents five connected planning tools. Each works for the currently selected destination.')
story += [two_cards([
    ('Trip Planner', '<b>Purpose:</b> Build a destination-specific itinerary.<br/><br/><b>Includes:</b> best months to visit, travel note, current crowd category, flight/train/road choices with duration and price range, nearby attractions with distance/time, and a trip snapshot.<br/><br/><b>Interaction:</b> choose a travel mode, add nearby places, then save the itinerary after signing in.', TEAL),
    ('Crowd & Peak Hours', '<b>Purpose:</b> Help travellers avoid congestion.<br/><br/><b>Includes:</b> hourly density chart for a typical day, quietest-hour recommendation, current live-status card and nearby/alternative guidance when a location is packed.<br/><br/><b>Interaction:</b> signed-in travellers can submit low, medium or high crowd observations; recent reports update the status in real time.', CORAL),
    ('Expense Calculator', '<b>Purpose:</b> Translate a travel budget into a practical spending plan.<br/><br/><b>Inputs:</b> destination, trip days, traveller count, total budget and travel style (Budget, Balanced or Comfort).<br/><br/><b>Output:</b> estimated total plus allocation across stay, travel, food and activities; users can save estimates to their profile.', TEAL),
    ('Weather Advisory', '<b>Purpose:</b> Give a clear weather-led trip decision.<br/><br/><b>Includes:</b> live current temperature and conditions, rainfall context, a readable go/wait/reroute recommendation and destination-aware alternatives.<br/><br/><b>Data:</b> current weather uses Open-Meteo without an API key, with demo data as fallback.', CORAL),
    ('Smart Travel Assistant', '<b>Purpose:</b> Create guided trip answers from destination data and saved user context.<br/><br/><b>Supports:</b> trip roadmaps, budget splits, transport choices, places to visit, weather/timing reminders and packing lists.<br/><br/><b>Implementation:</b> a free, browser-based rule system - present it accurately as a rule-based smart assistant, not a generative AI model.', TEAL),
    ('Profile, reviews & authentication', '<b>Purpose:</b> Make personal planning persistent and community feedback useful.<br/><br/><b>Includes:</b> Firebase email/password sign-in, saved itineraries, saved budget estimates, saved assistant conversations and public traveller reviews. Users can only modify their own protected data.', CORAL)
])]
story.append(PageBreak())

# Data / technical
story += section_title('3. Data and technology behind the prototype', 'The website is a frontend prototype with Firebase-backed user features and a live weather integration.')
data_rows=[
    [P('Area','TableHead'),P('Implemented approach','TableHead'),P('How to present it','TableHead')],
    [P('Destination data','CardBody'),P('Six destination records include coordinates, seasons, travel choices, nearby places, historic hourly crowd patterns and cost ratios.','CardBody'),P('A structured destination dataset powers consistent, contextual recommendations.','CardBody')],
    [P('Weather','CardBody'),P('Open-Meteo is called directly for live conditions; the interface falls back to original demo data if needed.','CardBody'),P('Live weather context is available without a paid API key.','CardBody')],
    [P('Crowd','CardBody'),P('Firestore stores user crowd reports by destination. Only reports from the previous 30 minutes affect the live read; the chart remains a typical historical pattern.','CardBody'),P('Community-reported live status is clearly separated from forecast-style hourly trends.','CardBody')],
    [P('Accounts & storage','CardBody'),P('Firebase Authentication handles email/password accounts. Firestore stores profiles, private trips, private budgets, chats and public reviews.','CardBody'),P('Authentication and security rules protect personal information; passwords are not stored in Firestore.','CardBody')],
    [P('Smart Assistant','CardBody'),P('Runs in the visitor browser with TouriSense destination data and the signed-in user’s saved plans/budgets. No AI API, secret key or per-message cost.','CardBody'),P('A zero-cost, rule-based trip planning assistant.','CardBody')],
]
tech=Table(data_rows,colWidths=[31*mm,76*mm,65*mm],repeatRows=1)
tech.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),NAVY),('TEXTCOLOR',(0,0),(-1,0),colors.white),('BACKGROUND',(0,1),(-1,-1),colors.white),('GRID',(0,0),(-1,-1),.5,LINE),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,PALE])]))
story += [tech, Spacer(1,10), P('Important prototype boundary', 'H2Rahi'), P('The project is not a booking platform. It does not accept payments, issue tickets, reserve rooms or use scraped travel prices. A future production version should use server-side or Cloud Function endpoints for payment webhooks and any paid API keys.')]
story.append(PageBreak())

# Demo & ppt guide
story += section_title('4. Suggested presentation narrative', 'Use these points to explain the prototype clearly to SIH judges. This is not a PPT - it is a speaking outline based on the website.')
steps=[
    ('Start with the problem', 'Trip planning is fragmented: destination discovery, transport choices, crowd risk, weather and budget are usually checked separately.'),
    ('Introduce the solution', 'TouriSense is a single destination-aware tourism planning experience. Search once and every tool updates around the same destination.'),
    ('Show the home search', 'Select Goa, Jaipur or another supported destination. Point out the instant snapshot: season, quietest hour, transport options and weather context.'),
    ('Demonstrate trip planning', 'Show travel mode choices, nearby attractions and the itinerary snapshot. Add places and explain that a signed-in user can save the plan.'),
    ('Demonstrate crowd insight', 'Explain the difference between the 24-hour typical density pattern and the real-time community reports. Submit observations from two authenticated windows for a compelling live update.'),
    ('Demonstrate budget & weather', 'Change days, travellers, budget and travel style to show cost allocation. Then open Weather Advisory and explain the go/wait/reroute recommendation.'),
    ('Close with persistence & next steps', 'Show saved plans, budget estimates and assistant chats in Profile. Future work can connect verified venue feeds, partner bookings and server-side integrations.')
]
for i,(head,body) in enumerate(steps,1):
    story.append(KeepTogether([P(f'{i}. {head}', 'H2Rahi'),P(body)]))
story += [Spacer(1,5), Table([[P('Key judge takeaway: TouriSense is not just a set of travel pages. It is a connected decision-support journey that carries one destination context through planning, crowd, weather, cost and saved personal travel information.', 'Callout')]],colWidths=[172*mm],style=TableStyle([('BACKGROUND',(0,0),(-1,-1),MINT),('BOX',(0,0),(-1,-1),.7,HexColor('#BCE4E1')),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10)]))]

doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
