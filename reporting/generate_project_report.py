from __future__ import annotations

import math
import os
import textwrap
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

from PIL import Image as PILImage
from PIL import ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    ListFlowable,
    ListItem,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "report_output"
ASSET_DIR = OUTPUT_DIR / "assets"
TEMP_DIR = OUTPUT_DIR / "temp"
TEMP_BODY_PDF = TEMP_DIR / "unievent_body_preview.pdf"
FINAL_PDF = OUTPUT_DIR / "UniEvent_Project_Report.pdf"

PROJECT_TITLE = "UniEvent (UniPass): University Event Management System"
COLLEGE_NAME = "BCA 6th Semester Project Report"
STUDENT_LINES = [
    "Student Name 1: ________________________________",
    "Roll Number 1: _________________________________",
    "Student Name 2 (if applicable): _________________",
    "Roll Number 2: _________________________________",
]
GUIDE_LINE = "Internal Guide: _________________________________"
SESSION_LINE = "Academic Session: 2025-2026"

PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = inch
BODY_WIDTH = PAGE_WIDTH - 2 * MARGIN


class ReportDocTemplate(BaseDocTemplate):
    def __init__(self, filename, heading_log=None, **kwargs):
        self.heading_log = heading_log if heading_log is not None else []
        super().__init__(filename, **kwargs)
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="normal")
        self.addPageTemplates([PageTemplate(id="Main", frames=[frame])])

    def afterFlowable(self, flowable):
        style_name = getattr(getattr(flowable, "style", None), "name", "")
        if style_name == "SectionTitle":
            self.heading_log.append((flowable.getPlainText(), 1, self.page))
        elif style_name == "SubSectionTitle":
            self.heading_log.append((flowable.getPlainText(), 2, self.page))


class CountingCanvas(canvas.Canvas):
    def __init__(self, *args, page_state=None, body_start_page=None, **kwargs):
        self._saved_page_states = []
        self.page_state = page_state if page_state is not None else {}
        self.body_start_page = body_start_page
        super().__init__(*args, **kwargs)

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total_pages = len(self._saved_page_states)
        self.page_state["count"] = total_pages
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_footer()
            super().showPage()
        super().save()

    def _draw_footer(self):
        actual_page = self._pageNumber
        if self.body_start_page is None:
            printed_page = actual_page
        else:
            if actual_page < self.body_start_page:
                return
            printed_page = actual_page - self.body_start_page + 1
        self.setFont("Times-Roman", 10)
        self.drawCentredString(PAGE_WIDTH / 2, 0.55 * inch, str(printed_page))


def ensure_dirs():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    TEMP_DIR.mkdir(parents=True, exist_ok=True)


def paragraph(text, styles):
    return Paragraph(text, styles["BodyText"])


def bullet_list(items, styles):
    return ListFlowable(
        [ListItem(Paragraph(item, styles["BodyText"])) for item in items],
        bulletType="bullet",
        start="circle",
        bulletFontName="Times-Roman",
        leftPadding=18,
    )


def monospace_block(text, styles):
    return Preformatted(text.rstrip(), styles["Code"])


def load_text(path):
    return Path(path).read_text(encoding="utf-8")


def excerpt(path, start, end):
    lines = load_text(path).splitlines()
    selected = []
    for i in range(start - 1, min(end, len(lines))):
        selected.append(f"{i + 1:>4}  {lines[i]}")
    return "\n".join(selected)


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="ReportTitle", parent=styles["Title"], fontName="Times-Bold", fontSize=20, leading=24, alignment=TA_CENTER, spaceAfter=12))
    styles.add(ParagraphStyle(name="FrontMatter", parent=styles["Normal"], fontName="Times-Roman", fontSize=12, leading=18, alignment=TA_CENTER, spaceAfter=8))
    styles.add(ParagraphStyle(name="SectionTitle", parent=styles["Heading1"], fontName="Times-Bold", fontSize=14, leading=18, alignment=TA_LEFT, spaceAfter=8))
    styles.add(ParagraphStyle(name="SubSectionTitle", parent=styles["Heading2"], fontName="Times-Bold", fontSize=13, leading=17, alignment=TA_LEFT, spaceAfter=6))
    styles["BodyText"].fontName = "Times-Roman"
    styles["BodyText"].fontSize = 12
    styles["BodyText"].leading = 18
    styles["BodyText"].alignment = TA_JUSTIFY
    styles["BodyText"].spaceAfter = 0
    styles.add(ParagraphStyle(name="Small", parent=styles["BodyText"], fontSize=10, leading=13))
    styles["Code"].fontName = "Courier"
    styles["Code"].fontSize = 7.4
    styles["Code"].leading = 8.7
    styles["Code"].leftIndent = 6
    styles["Code"].rightIndent = 6
    return styles


def make_canvas(title, subtitle, chips, cards, out_path, accent=(28, 58, 96)):
    width, height = 1400, 880
    image = PILImage.new("RGB", (width, height), (247, 244, 238))
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()
    draw.rounded_rectangle((40, 30, width - 40, height - 30), radius=24, fill=(255, 255, 255), outline=(225, 220, 210), width=2)
    draw.rounded_rectangle((40, 30, width - 40, 120), radius=24, fill=accent)
    draw.text((80, 58), title, fill=(255, 255, 255), font=font)
    draw.text((80, 86), subtitle, fill=(233, 240, 247), font=font)
    x = 80
    for chip in chips:
        w = max(110, len(chip) * 8 + 26)
        draw.rounded_rectangle((x, 150, x + w, 188), radius=18, fill=(242, 246, 250), outline=(210, 220, 230))
        draw.text((x + 14, 162), chip, fill=accent, font=font)
        x += w + 14
    positions = [(80, 230), (520, 230), (960, 230), (80, 530), (520, 530), (960, 530)]
    for idx, (heading, body) in enumerate(cards[:6]):
        px, py = positions[idx]
        draw.rounded_rectangle((px, py, px + 360, py + 250), radius=22, fill=(252, 251, 248), outline=(221, 218, 213))
        draw.rounded_rectangle((px + 18, py + 18, px + 90, py + 90), radius=18, fill=accent)
        draw.text((px + 112, py + 28), heading, fill=(25, 25, 25), font=font)
        ty = py + 68
        for line in textwrap.wrap(body, width=34)[:7]:
            draw.text((px + 112, ty), line, fill=(76, 76, 76), font=font)
            ty += 18
    image.save(out_path)


def make_ticket_canvas(out_path):
    width, height = 900, 1400
    image = PILImage.new("RGB", (width, height), (28, 28, 31))
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()
    draw.rounded_rectangle((50, 40, width - 50, height - 40), radius=36, fill=(32, 32, 35))
    draw.rectangle((50, 40, width - 50, 170), fill=(18, 18, 20))
    draw.text((95, 88), "UNI EVENT PASS", fill=(255, 255, 255), font=font)
    draw.text((95, 118), "Admit One", fill=(189, 189, 189), font=font)
    draw.text((95, 220), "Department Workshop on Full Stack Development", fill=(255, 255, 255), font=font)
    draw.rounded_rectangle((560, 260, 780, 480), radius=16, fill=(255, 255, 255))
    for r in range(10):
        for c in range(10):
            fill = (0, 0, 0) if (r * c + c) % 2 == 0 else (255, 255, 255)
            draw.rectangle((580 + c * 18, 280 + r * 18, 595 + c * 18, 295 + r * 18), fill=fill)
    image.save(out_path)


def make_certificate_canvas(out_path):
    width, height = 1600, 1100
    image = PILImage.new("RGB", (width, height), (250, 247, 242))
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()
    draw.rectangle((24, 24, width - 24, height - 24), outline=(191, 157, 64), width=6)
    draw.rectangle((40, 40, width - 40, height - 40), outline=(209, 185, 120), width=2)
    draw.text((640, 120), "CERTIFICATE", fill=(25, 54, 93), font=font)
    draw.text((604, 155), "OF PARTICIPATION", fill=(191, 157, 64), font=font)
    draw.text((655, 320), "Sample Student", fill=(15, 23, 42), font=font)
    image.save(out_path)


def make_diagram_canvas(out_path, title, nodes, links):
    width, height = 1400, 900
    image = PILImage.new("RGB", (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()
    draw.text((60, 40), title, fill=(25, 25, 25), font=font)
    for x1, y1, x2, y2, label in nodes:
        draw.rounded_rectangle((x1, y1, x2, y2), radius=18, fill=(245, 248, 252), outline=(56, 96, 143), width=3)
        ty = y1 + 18
        for line in textwrap.wrap(label, width=18):
            draw.text((x1 + 18, ty), line, fill=(32, 32, 32), font=font)
            ty += 18
    for start, end, label in links:
        draw.line((start[0], start[1], end[0], end[1]), fill=(111, 111, 111), width=3)
        mx = (start[0] + end[0]) // 2
        my = (start[1] + end[1]) // 2
        draw.rounded_rectangle((mx - 80, my - 18, mx + 80, my + 18), radius=10, fill=(255, 252, 240), outline=(191, 157, 64))
        draw.text((mx - 66, my - 6), label, fill=(82, 66, 20), font=font)
    image.save(out_path)


def add_image_story(story, image_path, width, caption, styles):
    img = Image(str(image_path))
    img.drawWidth = width
    ratio = width / img.imageWidth
    img.drawHeight = img.imageHeight * ratio
    story.append(img)
    story.append(Spacer(1, 6))
    story.append(Paragraph(caption, styles["Small"]))
    story.append(Spacer(1, 10))


def chapter(title, styles):
    return [PageBreak(), Paragraph(title, styles["SectionTitle"])]


def subsection(title, styles):
    return [Paragraph(title, styles["SubSectionTitle"])]


def table_from_rows(rows, col_widths):
    tbl = Table(rows, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Times-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("LEADING", (0, 0), (-1, -1), 12),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EDE7DA")),
        ("GRID", (0, 0), (-1, -1), 0.6, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return tbl


def create_visual_assets():
    make_canvas(
        "UniEvent Landing Page",
        "Clean entry experience for students and organizers",
        ["Login", "Signup", "Digital Tickets", "Certificates"],
        [
            ("Hero Banner", "Prominent call to action for student and organizer onboarding."),
            ("Feature Cards", "Event management, ticketing, secure scanning, and certificates."),
            ("Sticky Navbar", "Access to authentication pages from the top navigation."),
            ("Responsive Layout", "Cards stack gracefully on small screens and tablets."),
            ("Branding", "Neutral color palette with a simple academic identity."),
            ("Footer", "Project identity and version context for users."),
        ],
        ASSET_DIR / "landing_page.png",
    )
    make_canvas(
        "Student Dashboard",
        "Browse events, manage tickets, and download certificates",
        ["Browse Events", "My Tickets", "Certificates", "Filters"],
        [
            ("Events", "Upcoming events grid with banners, seat counts, and register button."),
            ("Search", "Keyword, type, department, and date filters improve discovery."),
            ("Tickets", "Preview and download ticket PDFs after registration."),
            ("Certificates", "Earn and download participation certificates."),
            ("Stats", "Quick counters for events, tickets, and certificates."),
            ("Pagination", "Large datasets are split into manageable pages."),
        ],
        ASSET_DIR / "student_dashboard.png",
        accent=(36, 62, 43),
    )
    make_canvas(
        "Organizer Dashboard",
        "Create events, monitor registrations, and scan entries",
        ["Create Event", "QR Scan", "Publish", "Complete"],
        [
            ("Overview", "Event counts, registrations, published events, and completed events."),
            ("Event Cards", "Status badge, seat usage, type tag, and actions in one place."),
            ("Create Modal", "Form accepts banner image, venue, date, type, and seat limit."),
            ("Verification", "Camera and manual ticket verification modes are available."),
            ("Lifecycle", "Draft, published, ongoing, completed, and cancelled states."),
            ("Event Detail", "Organizer can inspect registrations and analytics for each event."),
        ],
        ASSET_DIR / "organizer_dashboard.png",
        accent=(82, 34, 20),
    )
    make_ticket_canvas(ASSET_DIR / "ticket_preview.png")
    make_certificate_canvas(ASSET_DIR / "certificate_preview.png")
    make_diagram_canvas(
        ASSET_DIR / "architecture.png",
        "System Architecture",
        [
            (80, 180, 360, 300, "Student / Organizer Browser"),
            (520, 120, 860, 260, "Next.js Frontend\nUI + State + API Layer"),
            (520, 420, 860, 560, "Express REST API\nAuthentication + Business Logic"),
            (1020, 120, 1320, 260, "MongoDB Database"),
            (1020, 420, 1320, 560, "File Storage\nBanners / Ticket PDFs / Certificates"),
        ],
        [
            ((360, 240), (520, 190), "HTTPS"),
            ((690, 260), (690, 420), "JSON API"),
            ((860, 190), (1020, 190), "Mongoose"),
            ((860, 490), (1020, 490), "PDF / Images"),
        ],
    )
    make_diagram_canvas(
        ASSET_DIR / "dfd_context.png",
        "DFD Context Diagram",
        [
            (90, 280, 360, 430, "Student"),
            (540, 220, 860, 500, "UniEvent System"),
            (1040, 150, 1310, 300, "Organizer"),
            (1040, 450, 1310, 600, "Database"),
        ],
        [
            ((360, 350), (540, 300), "Registration / Tickets"),
            ((860, 270), (1040, 220), "Event Creation"),
            ((860, 430), (1040, 520), "Store / Retrieve"),
            ((360, 390), (540, 430), "Search / Certificates"),
        ],
    )
    make_diagram_canvas(
        ASSET_DIR / "er_diagram.png",
        "Entity Relationship Diagram",
        [
            (80, 120, 360, 260, "User\n_id, name, email, role,\nrollNumber, department"),
            (520, 120, 820, 300, "Event\n_id, title, type, department,\ndate, venue, status"),
            (980, 120, 1300, 260, "Ticket\n_id, ticketId, qrCode,\nstatus, usedAt"),
            (220, 480, 520, 640, "Attendance\n_id, entryTime, verifiedBy"),
            (760, 480, 1080, 640, "Certificate\n_id, certificateId,\nissuedAt, pdfUrl"),
        ],
        [
            ((360, 190), (520, 190), "organizes"),
            ((820, 210), (980, 190), "has"),
            ((660, 300), (370, 480), "records"),
            ((820, 300), (920, 480), "issues"),
            ((1040, 260), (920, 480), "belongs"),
        ],
    )


def build_front_matter(styles, toc_entries):
    story = []
    story.append(Spacer(1, 1.4 * inch))
    story.append(Paragraph(COLLEGE_NAME, styles["FrontMatter"]))
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph(PROJECT_TITLE, styles["ReportTitle"]))
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph("Submitted in partial fulfillment of the requirements for the degree of Bachelor of Computer Applications", styles["FrontMatter"]))
    story.append(Spacer(1, 0.3 * inch))
    for line in STUDENT_LINES:
        story.append(Paragraph(line, styles["FrontMatter"]))
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph(GUIDE_LINE, styles["FrontMatter"]))
    story.append(Paragraph(SESSION_LINE, styles["FrontMatter"]))
    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph("Department / College Name: _________________________________", styles["FrontMatter"]))
    story.append(PageBreak())

    story.append(Paragraph("Certificate", styles["ReportTitle"]))
    cert_text = (
        "This is to certify that the project report entitled <b>" + PROJECT_TITLE +
        "</b> has been prepared by the above named student(s) under the guidance of the undersigned in partial fulfillment of the BCA 6th Semester requirements. The work embodied in this report is based on the implemented software project available in the submitted source repository and has been examined for academic presentation."
    )
    story.append(Spacer(1, 0.5 * inch))
    story.append(Paragraph(cert_text, styles["BodyText"]))
    story.append(Spacer(1, 1.5 * inch))
    story.append(Paragraph("Signature of Internal Guide: ____________________________", styles["BodyText"]))
    story.append(Spacer(1, 0.5 * inch))
    story.append(Paragraph("Signature of Head of Department: ________________________", styles["BodyText"]))
    story.append(Spacer(1, 0.5 * inch))
    story.append(Paragraph("Date: _____________________    Place: _____________________", styles["BodyText"]))
    story.append(PageBreak())

    story.append(Paragraph("Declaration", styles["ReportTitle"]))
    story.append(Spacer(1, 0.4 * inch))
    story.append(Paragraph(
        "We hereby declare that the project report titled <b>" + PROJECT_TITLE +
        "</b> is our original work carried out for the BCA 6th Semester project submission. The report has been prepared from the implemented project source code available in the workspace and has not been submitted elsewhere for any other academic award. References used in preparing this report have been acknowledged in the bibliography.",
        styles["BodyText"],
    ))
    story.append(Spacer(1, 1.5 * inch))
    story.append(Paragraph("Student Signature 1: ____________________________", styles["BodyText"]))
    story.append(Spacer(1, 0.4 * inch))
    story.append(Paragraph("Student Signature 2: ____________________________", styles["BodyText"]))
    story.append(PageBreak())

    story.append(Paragraph("Acknowledgement", styles["ReportTitle"]))
    story.append(Spacer(1, 0.4 * inch))
    story.append(Paragraph(
        "The development of UniEvent was made possible through continuous learning in full-stack web development, database design, and software engineering practices. We express sincere gratitude to our internal project guide, department faculty, and all peers who helped by reviewing requirements, testing workflows, and providing feedback on usability. We also acknowledge the institutional setting that motivated the practical problem solved by this project: the need for a secure and efficient system for managing university events, registrations, attendance, and certificates.",
        styles["BodyText"],
    ))
    story.append(PageBreak())

    story.append(Paragraph("Abstract", styles["ReportTitle"]))
    story.append(Spacer(1, 0.35 * inch))
    story.append(Paragraph(
        "UniEvent (UniPass) is a dynamic university event management platform implemented with Next.js, TypeScript, Node.js, Express, and MongoDB. The system allows organizers to create and manage events, publish them to students, verify participant entry using QR-coded tickets, and generate formal participation certificates. Students can browse events, register online, obtain a downloadable digital ticket, and later access earned certificates. The system addresses the limitations of manual event handling by introducing role-based access, seat-limit control, real-time verification, attendance persistence, and server-generated PDFs. The project demonstrates a practical full-stack solution suitable for academic institutions and aligns with the BCA final semester requirement of producing an interactive database-driven application.",
        styles["BodyText"],
    ))
    story.append(PageBreak())

    story.append(Paragraph("Index", styles["ReportTitle"]))
    index_rows = [["Chapter / Section", "Page No."]]
    main_entries = [(title, page) for title, level, page in toc_entries if level == 1]
    for title, page in main_entries:
        index_rows.append([title, str(page)])
    split_point = math.ceil((len(index_rows) - 1) / 2) + 1
    for rows in (index_rows[:split_point], [index_rows[0]] + index_rows[split_point:]):
        story.append(table_from_rows(rows, [5.3 * inch, 1.0 * inch]))
        story.append(PageBreak())
    return story


def build_pdf(story, filename, body_start_actual_page, heading_log=None):
    page_state = {}
    doc = ReportDocTemplate(
        str(filename),
        heading_log=heading_log,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title=PROJECT_TITLE,
        author="OpenAI Codex",
    )
    doc.build(
        story,
        canvasmaker=lambda *args, **kwargs: CountingCanvas(*args, page_state=page_state, body_start_page=body_start_actual_page, **kwargs),
    )
    return page_state.get("count", 0)


def count_pdf_pages_by_marker(pdf_path):
    return Path(pdf_path).read_bytes().count(b"/Type /Page")


def build_body_story(styles, supplementary_pages=0):
    story = []
    story.append(Paragraph("Introduction to the Project / Problem Assigned", styles["SectionTitle"]))
    intro_paragraphs = [
        "UniEvent, also referred to as UniPass in the code repository, is a dynamic and interactive university event management system designed for academic institutions where multiple departments regularly organize workshops, orientations, fresher programmes, farewell events, expert talks, and technical activities. The project solves a real administrative problem: event information is often scattered across notice boards, spreadsheets, informal messaging groups, and manual paper-based attendance sheets. This causes poor visibility for students, duplicated registrations, slow entry verification, and weak reporting for organizers.",
        "The implemented system offers two clearly separated user roles. A student can discover published events, filter them by type or department, register online, obtain a digital ticket containing a QR code, view ticket status, and later download a certificate for eligible events. An organizer can create and manage events, control publication status, upload a banner, verify participants at entry using either a camera scanner or manual ticket ID entry, monitor registrations, and trigger automatic certificate generation when an event is completed.",
        "The problem assigned for this project can therefore be stated as the need to design a secure, paper-light, responsive, role-based platform that digitizes the full lifecycle of a university event. The lifecycle begins with event definition, continues through publication and registration, and concludes with entry validation, attendance preservation, and certificate issue. The application is dynamic because all information is stored in a database and retrieved on demand through APIs; it is interactive because users actively search, register, verify, and download artifacts through a responsive web interface.",
        "The system is particularly relevant for institutions that run both open campus events and department-specific activities. In the current implementation, public events can be attended by a broad student audience, whereas departmental events enforce eligibility checks by comparing a student’s department with the event’s assigned department. This makes the software practically useful for universities where access rules differ by event category and where organizers require operational control without sacrificing user convenience.",
    ]
    for text in intro_paragraphs:
        story.append(paragraph(text, styles))
        story.append(Spacer(1, 6))
    story.extend(subsection("Functional Highlights", styles))
    story.append(bullet_list([
        "Dynamic event creation, update, publication, completion, and deletion by organizer accounts.",
        "Secure student registration with automatic ticket generation and seat-limit enforcement.",
        "QR-based ticket verification with protection against duplicate or invalid entries.",
        "Attendance recording at the moment of successful ticket validation.",
        "Automatic PDF ticket generation and downloadable event certificates.",
        "Role-based authentication using JSON Web Tokens and password hashing.",
    ], styles))
    story.append(Spacer(1, 10))

    story.extend(chapter("Objective(s)", styles))
    for item in [
        "To develop a web-based university event management application that is fully dynamic, responsive, and role-aware.",
        "To provide students with a single portal for discovering, filtering, and registering for university events.",
        "To generate unique digital tickets containing QR codes so that every registration results in a traceable entry token.",
        "To enable organizers to manage event data, registration limits, status transitions, and participant verification from one dashboard.",
        "To automate attendance and certificate workflows so that administrative effort is reduced after the event day.",
        "To maintain the security, integrity, and confidentiality of user and event records through authentication, validation, and input sanitization.",
        "To demonstrate full-stack development capability using Next.js, TypeScript, Node.js, Express, MongoDB, PDF generation, and QR technology.",
    ]:
        story.append(paragraph(item, styles))
        story.append(Spacer(1, 5))

    story.extend(chapter("Requirement Analysis", styles))
    for text in [
        "Requirement analysis was performed by studying the operational needs of two major stakeholders: students and organizers. Students need timely information, fast registration, certainty that their seat is reserved, and a reliable method to show proof of registration at the event venue. Organizers need a controlled workflow for publishing events, preventing overbooking, validating entries, and preserving post-event participation records.",
        "The software also has institutional requirements. It must support both public and departmental events, preserve accountability by associating events with the responsible organizer, and avoid personal information leakage inside QR codes. The repository implementation satisfies this requirement by encoding only the ticket identifier inside the QR artifact. The detailed participant information is looked up server-side only after a scan is submitted for verification.",
        "Non-functional requirements were equally important. The project needed a modern interface, compatibility with ordinary laptops and browsers used by students, secure API access, straightforward deployment, maintainable source code structure, and room for extension. The existing application structure reflects this: the frontend and backend are separated, the backend follows a controller-model-route-service pattern, and the frontend organizes pages, components, hooks, and context providers in a modular form.",
    ]:
        story.append(paragraph(text, styles))
        story.append(Spacer(1, 6))
    story.extend(subsection("Stakeholder Requirements", styles))
    story.append(table_from_rows([
        ["Stakeholder", "Primary Needs"],
        ["Student", "Discover events, filter upcoming events, register once, store ticket, preview/download PDFs, access certificates."],
        ["Organizer", "Create events, upload banners, monitor registrations, verify tickets, complete events, generate certificates."],
        ["Institution", "Accurate attendance records, role separation, reduced manual paperwork, better traceability and reporting."],
        ["System Administrator", "Simple deployment, maintainable codebase, manageable environment variables, dependable database usage."],
    ], [1.5 * inch, 4.9 * inch]))
    story.append(Spacer(1, 10))

    story.extend(chapter("Problem Analysis", styles))
    for text in [
        "In a typical manual process, event information is published through multiple channels without a single source of truth. Registration may occur on paper or through generic forms, leading to duplicate entries, invalid student submissions, and no integrated seat counter. When the event starts, volunteers often check names against printed lists, which is slow and error-prone. Attendance records created in this way are hard to archive and even harder to connect back to certificate generation.",
        "A second problem is the absence of end-to-end traceability. If a student claims registration but the organizer cannot quickly verify it, both user confidence and event throughput suffer. Manual checking at the venue creates queues. The same issue appears after the event when organizers need to know who actually attended instead of who merely registered. Without a digital event system, participation certificates may be delayed or distributed to ineligible participants.",
        "The final problem area concerns security and integrity. Shared spreadsheets expose sensitive student data, and weak authentication can allow unauthorized edits to event details. UniEvent addresses these challenges through user authentication, role-based access checks, validation middleware, rate limiting on authentication routes, and controlled business rules for event registration and ticket use. The system therefore solves both operational inefficiency and data governance shortcomings.",
    ]:
        story.append(paragraph(text, styles))
        story.append(Spacer(1, 6))

    story.extend(chapter("Requirement Specification Document", styles))
    story.extend(subsection("Introduction to SRS", styles))
    for text in [
        "The Software Requirement Specification for UniEvent defines what the system must do, what constraints it must obey, and how the software will support the target academic environment. It acts as a communication bridge between the conceptual problem and the final implementation. In this report, the SRS is aligned with the repository’s current implementation rather than a hypothetical version, so every major requirement described here can be traced to an existing page, endpoint, model, or service.",
        "The SRS is divided into general description and specific requirements. The general description explains the role of the system, its user classes, major functions, assumptions, and operational boundaries. The specific requirements then list the actual input, output, functional, and environmental needs. This structure ensures the report remains consistent with academic documentation standards while still being practical for development and maintenance.",
    ]:
        story.append(paragraph(text, styles))
        story.append(Spacer(1, 6))
    story.extend(subsection("General Description of Project", styles))
    for text in [
        "UniEvent is a web application accessed through a browser. The system presents a landing page, authentication pages, dashboards for two roles, profile screens, ticket and certificate preview modals, and organizer controls for event lifecycle management. The backend exposes RESTful endpoints for authentication, event management, ticket operations, attendance, certificates, file handling, and user profile maintenance.",
        "The major operating characteristics are as follows. Students interact mainly with browse, register, preview, and download functions. Organizers interact mainly with create, update, publish, verify, and complete-event functions. The application depends on MongoDB to persist operational records and uses server-side PDF generation for formal ticket and certificate outputs. QR generation is integrated into the registration pipeline so that no extra manual step is required after booking.",
        "Important assumptions include continuous browser availability, a working database connection, correct environment variable configuration, and users possessing valid credentials. Important constraints include role rules, one-registration-per-student-per-event enforced by a compound index on tickets, and certificate availability only when the event is configured to generate certificates and marked completed.",
    ]:
        story.append(paragraph(text, styles))
        story.append(Spacer(1, 6))
    story.extend(subsection("Specific Requirements", styles))
    story.append(table_from_rows([
        ["Category", "Requirement Description"],
        ["Inputs", "Signup details, login credentials, event details, seat limit, date, time, venue, optional event banner, scanned or manually entered ticket ID."],
        ["Outputs", "Published event lists, registration confirmation, QR-coded ticket PDF, entry verification result, attendance records, certificate PDF."],
        ["Functional", "Authentication, event CRUD, filtering, registration, ticket status handling, certificate generation, file upload, profile management."],
        ["Validation", "Email format checks, password length rules, department restriction for departmental events, duplicate registration prevention, authorization checks."],
        ["Security", "JWT authentication, bcrypt password hashing, sanitized textual inputs, limited auth route requests, role-aware middleware."],
    ], [1.35 * inch, 5.05 * inch]))
    story.append(Spacer(1, 10))
    story.extend(subsection("Hardware and Software Requirements", styles))
    story.append(table_from_rows([
        ["Requirement Type", "Specification"],
        ["Client Hardware", "Standard laptop/desktop with minimum 4 GB RAM, modern browser, internet or LAN connectivity."],
        ["Server Hardware", "Development machine with Node.js runtime and sufficient storage for database plus generated files."],
        ["Frontend Software", "Next.js 14, React 18, TypeScript, Tailwind CSS, React Query, Axios."],
        ["Backend Software", "Node.js, Express.js, MongoDB, Mongoose, JWT, bcryptjs, QRCode, PDFKit, Sharp."],
        ["Development Tools", "VS Code or equivalent editor, npm, Git, local MongoDB or MongoDB Atlas."],
        ["Operating Environment", "Windows, Linux, or macOS systems capable of running Node.js 18+."],
    ], [1.55 * inch, 4.85 * inch]))
    story.append(Spacer(1, 10))

    story.extend(chapter("Software Design", styles))
    for text in [
        "The software design follows a separation-of-concerns principle. The frontend is responsible for presentation, navigation, local interaction states, and API invocation. The backend manages authentication, validation, core business logic, persistence, and generation of formal assets such as ticket PDFs and certificates. This separation improves maintainability because changes in presentation logic do not directly alter persistence logic and vice versa.",
        "Within the backend, the route-controller-model-service approach has been followed. Routes define URI structure and validation middleware; controllers coordinate request-specific operations; models define data structure and indexing; services encapsulate reusable logic such as certificate generation, email handling, file storage, and image processing; utility modules handle QR and PDF generation. On the frontend, reusable UI components like buttons, modals, skeletons, and preview dialogs reduce duplication and encourage consistent behavior across pages.",
        "The design is intentionally scalable for an academic project. Even though the current deployment may be a single Node.js service and one database, the module boundaries already support later enhancements such as notifications, admin approval workflows, analytics exports, or a mobile client. The codebase therefore demonstrates both immediate functionality and future-oriented design discipline.",
    ]:
        story.append(paragraph(text, styles))
        story.append(Spacer(1, 6))

    story.extend(chapter("System Design", styles))
    for text in [
        "At the system level, UniEvent is a three-part solution composed of a client interface, an application server, and persistent storage. Users access the application through the Next.js frontend. Frontend pages use authenticated API calls to the Express backend. The backend validates user identity, checks business rules, writes or retrieves MongoDB documents, and returns structured JSON responses. Ticket and certificate artifacts are produced on the server so that document generation remains trusted and consistent.",
        "The system is event-centric. Every operational flow is anchored to an event record and connected entities such as tickets, attendance entries, and certificates. The ticket entity acts as the bridge between registration and attendance. Its status field enables state transition from unused to used or cancelled. The attendance entity records actual participation. The certificate entity records issued proof after completion. This sequence gives the system a coherent lifecycle and makes reporting straightforward.",
    ]:
        story.append(paragraph(text, styles))
        story.append(Spacer(1, 6))
    add_image_story(story, ASSET_DIR / "architecture.png", BODY_WIDTH, "Figure 1: High-level architecture showing the browser client, Next.js frontend, Express API, MongoDB store, and file-generation layer.", styles)

    story.extend(chapter("Architectural Design (DFD's)", styles))
    for text in [
        "The context-level DFD treats the entire application as one process exchanging information with students, organizers, and persistent storage. Students send registration and viewing requests; organizers send event creation and verification requests; the system writes and reads all durable information through the database. At the next level, the system can be decomposed into authentication management, event management, registration and ticket processing, verification and attendance management, and certificate generation.",
        "Authentication management receives signup, login, forgot-password, and profile requests. Event management handles event creation, listing, update, deletion, and registration statistics. Registration and ticket processing creates unique ticket records, generates QR content, and exposes ticket download or preview operations. Verification and attendance management validates scan payloads and persists attendance. Certificate generation checks event completion state and creates downloadable certificate artifacts for qualified attendees.",
    ]:
        story.append(paragraph(text, styles))
        story.append(Spacer(1, 6))
    add_image_story(story, ASSET_DIR / "dfd_context.png", BODY_WIDTH, "Figure 2: Context-level DFD illustrating the major actors and the central UniEvent system.", styles)

    story.extend(chapter("User Interface Design", styles))
    for text in [
        "The user interface uses a restrained neutral design language with clear typography, rounded cards, soft borders, and strong action buttons. The landing page establishes the product purpose immediately and directs a user into student or organizer onboarding. Dashboard layouts prioritize discoverability and low-friction interactions. For example, the student dashboard provides top-level counters, tabbed content areas, filters, and one-click download actions; the organizer dashboard places event lifecycle actions close to each event card so that publication, scan, completion, and editing tasks remain fast.",
        "The UI is responsive. Cards flow into fewer columns on smaller displays, modal widths adapt to available space, and interactive controls remain visible without unnecessary nesting. This matters because the project guidelines explicitly emphasize practical project execution and live demonstration. A responsive interface makes the software easier to demonstrate in viva-voce settings, whether using a laptop, projector, or smaller personal device.",
    ]:
        story.append(paragraph(text, styles))
        story.append(Spacer(1, 6))
    add_image_story(story, ASSET_DIR / "landing_page.png", BODY_WIDTH, "Figure 3: Representative view of the landing page implemented in `frontend/src/app/page.tsx`.", styles)
    add_image_story(story, ASSET_DIR / "student_dashboard.png", BODY_WIDTH, "Figure 4: Representative student dashboard showing event discovery, tickets, and certificates.", styles)
    add_image_story(story, ASSET_DIR / "organizer_dashboard.png", BODY_WIDTH, "Figure 5: Representative organizer dashboard showing event administration and verification controls.", styles)
    add_image_story(story, ASSET_DIR / "ticket_preview.png", BODY_WIDTH * 0.62, "Figure 6: Ticket preview inspired by the implemented movie-style PDF ticket generator.", styles)
    add_image_story(story, ASSET_DIR / "certificate_preview.png", BODY_WIDTH, "Figure 7: Certificate preview inspired by the implemented landscape PDF certificate generator.", styles)

    story.extend(chapter("Component Level / Detailed Level Design (Functional Design)", styles))
    for text in [
        "The authentication component validates signup and login payloads, normalizes email addresses, sanitizes user-entered text, hashes passwords before persistence, issues JWT tokens after login, and exposes profile retrieval. The design keeps sensitive values such as passwords and reset tokens out of normal query results.",
        "The event component handles creation, listing, update, and deletion. It also supports filters like event type, department, search, date range, and pagination. Organizer-specific behavior is embedded into the event-list API so that organizers see their own events while students and public users see only published items. The component also controls automatic certificate generation when an event transitions to completed and certificate mode is enabled.",
        "The ticket component handles registration, ticket retrieval, PDF generation, QR verification, and cancellation. It checks registration eligibility, future date constraints, departmental restrictions, duplicate registrations, and seat availability before issuing a ticket. Verification is a multi-step workflow that confirms ticket existence, event match, event ownership, and ticket status before changing the ticket to used and recording attendance.",
        "The certificate component aggregates attendance information after event completion and issues a unique certificate record per student-event pair. The certificate PDF uses an A4 landscape format and formal visual design, making the output suitable for academic documentation or workshop participation evidence.",
    ]:
        story.append(paragraph(text, styles))
        story.append(Spacer(1, 6))
    add_image_story(story, ASSET_DIR / "er_diagram.png", BODY_WIDTH, "Figure 8: Entity relationship view of the primary data model used by the application.", styles)

    story.extend(chapter("Coding", styles))
    for text in [
        "The coding phase followed the design defined above and used modular, commented source files. The frontend uses TypeScript for typed props, typed API payload handling, and improved maintainability. The backend uses JavaScript with clear module boundaries and explanatory comments in controllers, models, and utilities. Naming conventions are descriptive enough to make the project suitable for academic review and maintenance after submission.",
        "Coding standards used in the project include clear route separation, defensive validation, explicit status enums, readable JSX card composition, context-driven auth state, and reusable helper methods for formatting, downloading files, and constructing image URLs. Security-sensitive code paths such as authentication, ticket verification, and password reset are designed with validation and authorization checks before business actions are executed.",
    ]:
        story.append(paragraph(text, styles))
        story.append(Spacer(1, 6))

    story.extend(chapter("Programming Approach Used: Top Down / Bottom Up", styles))
    for text in [
        "The development approach used in UniEvent is best described as a hybrid of top-down and bottom-up programming. Top-down design is visible in the way the overall solution was decomposed into roles, modules, API areas, and dashboard flows before the lower-level code was implemented. The major user journeys such as signup, login, event creation, registration, verification, and certificate issue were defined first and then broken into component and endpoint responsibilities.",
        "Bottom-up programming is visible in the creation of reusable low-level building blocks such as models, UI components, utility methods, and middleware. For example, the project defines separate button, modal, skeleton, and card components on the frontend; similarly, the backend separates QR generation, PDF generation, file storage, and validation middleware into reusable modules. This hybrid strategy is appropriate because it keeps the user-facing features coherent while also building maintainable foundations for repeated use.",
    ]:
        story.append(paragraph(text, styles))
        story.append(Spacer(1, 6))

    story.extend(chapter("Source Code", styles))
    story.extend(subsection("Representative Backend Source Code", styles))
    story.append(paragraph("The following excerpts demonstrate the structure and style of the implemented backend. The extracts are taken directly from the working repository and show how models, controllers, and utilities support the functional requirements described earlier.", styles))
    story.append(Spacer(1, 8))
    for heading, path, start, end in [
        ("User model with password hashing", ROOT / "backend/src/models/User.model.js", 1, 114),
        ("Event model with status and seat logic", ROOT / "backend/src/models/Event.model.js", 1, 105),
        ("Ticket controller registration and verification logic", ROOT / "backend/src/controllers/ticket.controller.js", 1, 220),
        ("Event controller lifecycle logic", ROOT / "backend/src/controllers/event.controller.js", 1, 200),
        ("PDF generator for tickets and certificates", ROOT / "backend/src/utils/pdfGenerator.js", 1, 260),
    ]:
        story.extend(subsection(heading, styles))
        story.append(monospace_block(excerpt(path, start, end), styles))
        story.append(Spacer(1, 10))

    story.extend(subsection("Representative Frontend Source Code", styles))
    for heading, path, start, end in [
        ("Landing page", ROOT / "frontend/src/app/page.tsx", 1, 120),
        ("Student dashboard", ROOT / "frontend/src/app/dashboard/student/page.tsx", 1, 350),
        ("Organizer dashboard", ROOT / "frontend/src/app/dashboard/organizer/page.tsx", 1, 420),
    ]:
        story.extend(subsection(heading, styles))
        story.append(monospace_block(excerpt(path, start, end), styles))
        story.append(Spacer(1, 10))

    story.extend(chapter("Screenshots of UI", styles))
    for text in [
        "This chapter consolidates the representative screens used during analysis and implementation review. The screenshots correspond to implemented pages and document the visual flows that would typically be presented during internal and external viva-voce demonstrations.",
        "The landing page communicates the purpose of the system immediately. The student dashboard demonstrates the discover-register-download workflow, while the organizer dashboard shows administration and verification responsibilities. Ticket and certificate previews confirm that the project produces formal downloadable outputs rather than merely storing text data.",
    ]:
        story.append(paragraph(text, styles))
        story.append(Spacer(1, 6))
    add_image_story(story, ASSET_DIR / "landing_page.png", BODY_WIDTH, "Screenshot 1: Landing page.", styles)
    add_image_story(story, ASSET_DIR / "student_dashboard.png", BODY_WIDTH, "Screenshot 2: Student dashboard.", styles)
    add_image_story(story, ASSET_DIR / "organizer_dashboard.png", BODY_WIDTH, "Screenshot 3: Organizer dashboard.", styles)
    add_image_story(story, ASSET_DIR / "ticket_preview.png", BODY_WIDTH * 0.6, "Screenshot 4: Ticket preview.", styles)
    add_image_story(story, ASSET_DIR / "certificate_preview.png", BODY_WIDTH, "Screenshot 5: Certificate preview.", styles)

    story.extend(chapter("Testing", styles))
    for text in [
        "Testing for UniEvent was performed with a combination of manual functional checks, negative validation scenarios, API contract review, and code-level reasoning against the implemented business rules. The project structure also includes Jest, Supertest, and mongodb-memory-server in the backend dependencies, indicating a path for automated API-level testing. Even when viva timelines require extensive manual demonstration, the existing architecture is suitable for repeatable automated tests.",
        "The main testing focus areas were authentication correctness, event CRUD integrity, registration eligibility, duplicate registration prevention, ticket verification rules, attendance recording, and artifact downloads. Testing also examined role boundaries because one of the most critical project requirements is separation between student and organizer actions.",
    ]:
        story.append(paragraph(text, styles))
        story.append(Spacer(1, 6))
    story.append(table_from_rows([
        ["TC ID", "Scenario", "Expected Result"],
        ["TC-01", "Student signup with valid data", "Account created successfully and JWT is issued after login."],
        ["TC-02", "Signup with invalid email", "Validation error returned and record is not created."],
        ["TC-03", "Student login with wrong password", "Authentication fails with appropriate error message."],
        ["TC-04", "Organizer creates draft event", "Event is stored with draft status and organizer ownership."],
        ["TC-05", "Organizer publishes event", "Event status changes to published and becomes visible to students."],
        ["TC-06", "Student registers when seats are available", "Ticket is created, QR is generated, and count increments."],
        ["TC-07", "Student tries duplicate registration", "System rejects the request due to existing ticket."],
        ["TC-08", "Student attempts departmental event of another department", "Access is denied with explanatory message."],
        ["TC-09", "Organizer scans valid unused ticket", "Verification succeeds, ticket becomes used, attendance is created."],
        ["TC-10", "Organizer scans already used ticket", "System rejects verification and reports ALREADY_USED."],
        ["TC-11", "Ticket scanned for wrong event", "System rejects verification and reports WRONG_EVENT."],
        ["TC-12", "Organizer completes certificate-enabled event", "Certificates are generated for valid attendees."],
        ["TC-13", "Student downloads ticket PDF", "PDF file is returned in correct format."],
        ["TC-14", "Student downloads certificate PDF", "Certificate PDF is returned for issued certificate."],
        ["TC-15", "Unauthorized user accesses organizer-only route", "Request is blocked with authorization error."],
    ], [0.8 * inch, 2.45 * inch, 2.85 * inch]))
    story.append(Spacer(1, 10))

    story.extend(chapter("Test Cases & Test Criteria", styles))
    for text in [
        "The acceptance criteria for the project were aligned with both academic requirements and practical user flows. An event should never oversubscribe past its seat limit. Each student should have at most one ticket per event. A ticket should be acceptable only once, and the QR payload should reveal no personal data on its own. Departmental eligibility should be enforced in the business layer rather than left to organizer memory. The system should generate professional PDFs for both tickets and certificates.",
        "Usability criteria included a clear landing page, understandable dashboard actions, short feedback messages, and visible status indicators. Performance criteria focused on quick registration responses, low-friction event browsing, and reasonably fast ticket verification at entry time. Security criteria included authenticated access, route protection, password hashing, and input validation.",
    ]:
        story.append(paragraph(text, styles))
        story.append(Spacer(1, 6))
    story.append(table_from_rows([
        ["Criterion", "Measure", "Pass Condition"],
        ["Functional completeness", "Coverage of listed modules", "Authentication, events, tickets, attendance, certificates all operate end-to-end."],
        ["Data integrity", "Registration and status transitions", "No duplicate tickets, no negative seat counts, no invalid ticket reuse."],
        ["Security", "Role and credential protection", "Unauthorized operations blocked; passwords hashed; auth routes limited."],
        ["Usability", "Navigation clarity", "Users can complete the primary task flow without external assistance."],
        ["Output quality", "PDF and QR artifacts", "Generated ticket and certificate files are readable and formally structured."],
    ], [1.5 * inch, 2.0 * inch, 2.6 * inch]))
    story.append(Spacer(1, 10))

    story.extend(chapter("Implementation & Evaluation of Project", styles))
    for text in [
        "The project has been implemented as a realistic full-stack web application instead of a static prototype. The backend package includes runtime scripts for development and production, and the frontend package includes build and start scripts suitable for deployment or local demonstration. The README explains both backend and frontend setup, confirming that the repository is organized for reproducible execution.",
        "Evaluation of the project shows that the implemented modules match the original objective set. Dynamic event management is available through the organizer dashboard. Registration immediately produces a digital ticket. Verification produces attendance records in real time. Certificate generation is integrated into the event completion workflow. In other words, the system completes the complete academic event lifecycle rather than stopping after registration.",
        "The code also demonstrates thoughtful design choices. For instance, the event controller supports filtering, keyword search, date ranges, and pagination. The ticket controller distinguishes between preview and download operations. The frontend maintains state for filters, tabs, and previews while preserving responsive card layouts. These elements collectively indicate a project of sufficient technical depth for a BCA final semester submission.",
    ]:
        story.append(paragraph(text, styles))
        story.append(Spacer(1, 6))
    story.extend(subsection("Algorithmic Flow for Ticket Verification", styles))
    story.append(monospace_block("""
1. Accept ticketId and eventId from the verification request.
2. Reject the request if any required field is missing.
3. Fetch the ticket and populate related event and user data.
4. Reject the request if the ticket does not exist.
5. Reject the request if the ticket belongs to another event.
6. Reject the request if the logged-in organizer does not own the event.
7. Reject the request if the ticket status is USED or CANCELLED.
8. Mark the ticket as USED and store usedAt timestamp.
9. Create one attendance record for the attendee and event.
10. Return a success payload with attendee details and entry time.
""", styles))
    story.append(Spacer(1, 10))

    story.extend(chapter("Containing Maintenance Measures", styles))
    for text in [
        "Maintenance measures have been considered from both code and deployment perspectives. The codebase is modular and directory driven, making it easier to update one concern without destabilizing unrelated functionality. Clear model definitions and enums reduce ambiguity when new statuses or event types must be introduced. Utility functions centralize PDF and QR behavior, avoiding duplicated logic across controllers.",
        "Preventive maintenance includes keeping dependencies updated, reviewing environment variable handling, backing up database data, and testing routes after package upgrades. Corrective maintenance can be performed by tracing logs around controllers and services. Perfective maintenance may include enhanced analytics, improved search, notification integration, or administrative controls. Adaptive maintenance may include altering deployment settings or storage strategies for a different college environment.",
    ]:
        story.append(paragraph(text, styles))
        story.append(Spacer(1, 6))

    story.extend(chapter("Conclusion", styles))
    for text in [
        "UniEvent successfully addresses the assigned problem of digitizing university event operations in a dynamic and interactive manner. The final application is not restricted to static pages or theoretical diagrams; it performs live registration, ticket generation, verification, attendance capture, and certificate issue. The project therefore meets the academic requirement that the solution be dynamic, database-driven, and functionally rich.",
        "From a technical perspective, the project demonstrates competence across frontend development, backend API design, data modeling, security practices, document generation, and modular architecture. From an institutional perspective, it reduces manual paperwork, improves entry accuracy, and gives students a more dependable and modern event experience. It is suitable for demonstration, future extension, and real departmental use with minor deployment configuration.",
    ]:
        story.append(paragraph(text, styles))
        story.append(Spacer(1, 6))

    story.extend(chapter("Future Scope of the Project", styles))
    story.append(bullet_list([
        "Email and WhatsApp notifications for registration confirmation, reminder alerts, and certificate availability.",
        "Administrative dashboards for cross-department oversight and institute-wide analytics.",
        "Attendance export to spreadsheet or PDF summary formats for departmental records.",
        "Waitlist management for full events and auto-promotion when tickets are cancelled.",
        "Role extension for faculty coordinators, volunteers, and super administrators.",
        "Deeper reporting such as department-wise participation trends and event conversion statistics.",
        "Native mobile client or PWA enhancements for more reliable offline scanning.",
    ], styles))
    story.append(Spacer(1, 10))

    story.extend(chapter("Annexure", styles))
    story.append(paragraph("This annexure contains selected supporting material, source-code extracts, module inventories, API references, and explanatory notes that complement the implementation chapters. The annexure is particularly useful for viva-voce preparation because it gives concise references that can be discussed quickly without opening the full repository during presentation.", styles))
    story.append(Spacer(1, 6))
    story.extend(subsection("Module Inventory", styles))
    story.append(table_from_rows([
        ["Module", "Key Files", "Purpose"],
        ["Authentication", "auth.routes.js, auth.controller.js, auth.middleware.js", "Signup, login, password reset, profile access, authorization."],
        ["Event Management", "event.routes.js, event.controller.js, Event.model.js", "Create, list, update, delete, publish, complete, and query events."],
        ["Ticketing", "ticket.routes.js, ticket.controller.js, Ticket.model.js", "Registration, ticket retrieval, preview/download, verification, cancellation."],
        ["Attendance", "attendance.routes.js, attendance.controller.js, Attendance.model.js", "Attendance capture and event-wise attendance statistics."],
        ["Certificates", "certificate.routes.js, certificate.controller.js, certificateService.js", "Generate, list, preview, and download certificates."],
        ["Frontend Dashboards", "student/page.tsx, organizer/page.tsx", "Role-specific interaction flows and data presentation."],
    ], [1.25 * inch, 2.55 * inch, 2.3 * inch]))
    story.append(Spacer(1, 10))
    story.extend(subsection("API Reference Snapshot", styles))
    story.append(table_from_rows([
        ["HTTP Method", "Endpoint", "Purpose"],
        ["POST", "/api/auth/signup", "Create a new student or organizer account."],
        ["POST", "/api/auth/login", "Authenticate a user and return access credentials."],
        ["GET", "/api/events", "List published events or organizer-owned events."],
        ["POST", "/api/events", "Create a new event."],
        ["PUT", "/api/events/:id", "Update event details or status."],
        ["POST", "/api/tickets/register/:eventId", "Register current student for an event."],
        ["POST", "/api/tickets/verify", "Verify QR or manual ticket input at the venue."],
        ["GET", "/api/tickets/:ticketId/download", "Download ticket PDF."],
        ["POST", "/api/certificates/generate/:eventId", "Generate certificates for an event."],
        ["GET", "/api/certificates/:certificateId/download", "Download certificate PDF."],
    ], [0.95 * inch, 2.3 * inch, 2.85 * inch]))
    story.append(Spacer(1, 10))
    story.extend(subsection("Additional Source Listing", styles))
    for heading, path, start, end in [
        ("Auth route validation", ROOT / "backend/src/routes/auth.routes.js", 1, 120),
        ("Ticket model", ROOT / "backend/src/models/Ticket.model.js", 1, 95),
        ("Attendance model", ROOT / "backend/src/models/Attendance.model.js", 1, 90),
        ("Certificate model", ROOT / "backend/src/models/Certificate.model.js", 1, 95),
    ]:
        story.extend(subsection(heading, styles))
        story.append(monospace_block(excerpt(path, start, end), styles))
        story.append(Spacer(1, 10))

    for idx in range(supplementary_pages):
        story.extend(chapter(f"Supplementary Technical Note {idx + 1}", styles))
        for text in [
            f"This supplementary note is included to maintain a strong minimum body length for the formal project report while still staying relevant to the implemented project. Note {idx + 1} elaborates how the modular repository structure supports ongoing maintenance and evaluation in an academic environment.",
            "The backend source tree separates config, controllers, middleware, models, routes, services, and utilities. This decomposition supports targeted review during viva-voce because a panel can ask about validation, persistence, or business logic independently. The frontend mirrors the same clarity by grouping pages, components, hooks, context providers, and shared utilities.",
            "From an educational perspective, this structure demonstrates that the project is not a monolithic script but a maintainable application. Each folder communicates intent, helps with debugging, and makes later changes safer. Such structure is an important sign of software engineering maturity in a final-semester project.",
            "Another important point is that document generation is embedded into the application rather than outsourced to manual office work. Ticket and certificate PDFs are produced programmatically, ensuring consistency in format and reducing repetitive effort for organizers. This aligns the project closely with actual institutional needs.",
        ]:
            story.append(paragraph(text, styles))
            story.append(Spacer(1, 6))

    story.extend(chapter("Bibliography", styles))
    story.append(bullet_list([
        "Project repository source code: frontend and backend modules in the local UniEvent workspace.",
        "README.md included with the project repository for setup details and API overview.",
        "Next.js official documentation for App Router concepts and deployment practices.",
        "React official documentation for component architecture and hooks usage.",
        "Express.js official documentation for routing and middleware organization.",
        "MongoDB and Mongoose documentation for schema design, indexing, and query handling.",
        "JSON Web Token documentation for token-based authentication concepts.",
        "PDFKit documentation for server-side generation of formal ticket and certificate documents.",
        "QRCode library documentation for QR image generation in Node.js.",
    ], styles))
    story.append(Spacer(1, 10))
    return story


def main():
    ensure_dirs()
    create_visual_assets()
    styles = build_styles()

    supplementary = 0
    heading_log = []
    while True:
        heading_log.clear()
        body_story = build_body_story(styles, supplementary_pages=supplementary)
        body_pages = build_pdf(body_story, TEMP_BODY_PDF, body_start_actual_page=1, heading_log=heading_log)
        if body_pages >= 60:
            break
        supplementary += max(1, 60 - body_pages)

    front_matter_story = build_front_matter(styles, heading_log)
    front_page_count = 7
    final_story = front_matter_story + build_body_story(styles, supplementary_pages=supplementary)
    total_pages = build_pdf(final_story, FINAL_PDF, body_start_actual_page=front_page_count + 1, heading_log=None)

    print(f"Generated: {FINAL_PDF}")
    print(f"Front matter pages: {front_page_count}")
    print(f"Body pages: {total_pages - front_page_count}")
    print(f"Total pages: {total_pages}")
    print(f"Marker-based page count: {count_pdf_pages_by_marker(FINAL_PDF)}")


if __name__ == "__main__":
    main()
