"""Sample documents for the medical_document domain pack (rendered by make_samples.py).

Both documents are fictional. Doses, ICD-10 codes and the layout of the
bundeseinheitlicher Medikationsplan are realistic so the samples exercise the
harness: slot-wise dose checks, paused/new medicines, follow-up dates, warning
signs and the weekly-methotrexate safety note.
"""

from make_samples import BODY_W, MARGIN, Letter, font

PLAIN = "medical_document"


def entlassbrief() -> Letter:
    L = Letter(
        id="entlassbrief",
        domain=PLAIN,
        description="Hospital discharge letter: 3 diagnoses, 4 medicines (new, continued, time-limited, paused), "
        "follow-up date, warning signs. No warnings expected.",
        document_type="Hospital discharge letter (Entlassbrief)",
        document_class="discharge_letter",
        sender="Klinikum Musterstadt, Department of Internal Medicine",
        summary="You were in hospital from 1 to 8 October 2026. You had an infection of the kidney. "
        "It got better with antibiotics. You have a new medicine for your blood pressure. "
        "Do not take Metformin for now. See your family doctor on 15 October 2026.",
        action_steps=[
            "Take your medicines as shown in your daily plan.",
            "Take the antibiotic Cefuroxim until 12 October 2026. Then it is finished.",
            "Do not take Metformin until your doctor has checked your kidneys.",
            "Drink at least 2 litres every day.",
            "Go to your family doctor on 15 October 2026.",
            "Get help at once if you get a high fever, strong pain in your side, or feel confused.",
        ],
        expected_findings=["escalation"],
    )
    L.para(
        "p0-b0",
        "Klinikum Musterstadt\nKlinik für Innere Medizin\nChefarzt Prof. Dr. med. Thomas Berg",
        "Klinikum Musterstadt (hospital)\nDepartment of Internal Medicine\nHead physician Prof. Dr. Thomas Berg",
        MARGIN,
        100,
        560,
        font(bold=True, size=24),
    )
    L.para(
        "p0-b1",
        "Station 4B\nTel.: 0123 4567-400\nDatum: 08.10.2026",
        "Ward 4B\nPhone: 0123 4567-400\nDate: 8 October 2026",
        800,
        100,
        320,
        font(size=21),
    )
    L.para(
        "p0-b2",
        "Frau Dr. med. Anna Schmidt\nHausarztpraxis\nLindenstraße 8\n12345 Musterstadt",
        "Dr. Anna Schmidt\nFamily practice\nLindenstraße 8\n12345 Musterstadt",
        MARGIN,
        280,
        500,
        font(size=23),
    )
    y = L.para("p0-b3", "Entlassbrief", "Discharge letter", MARGIN, 470, BODY_W, font(bold=True, size=32))
    y = L.para(
        "p0-b4",
        "Patientin: Erika Mustermann, geb. 12.03.1948\nStationärer Aufenthalt: 01.10.2026 bis 08.10.2026",
        "Patient: Erika Mustermann, born 12 March 1948\nHospital stay: 1 October 2026 to 8 October 2026",
        MARGIN,
        y + 20,
        BODY_W,
        font(size=23),
    )
    y = L.para(
        "p0-b5", "Sehr geehrte Frau Kollegin,", "Dear colleague,", MARGIN, y + 26, BODY_W, font(size=23)
    )
    y = L.para(
        "p0-b6",
        "Diagnosen:\nAkute Pyelonephritis rechts (N10)\nArterielle Hypertonie (I10.90)\nDiabetes mellitus Typ 2 (E11.90)",
        "Diagnoses:\nAcute kidney infection, right side (N10)\nHigh blood pressure (I10.90)\nType 2 diabetes (E11.90)",
        MARGIN,
        y + 22,
        BODY_W,
        font(size=23),
    )
    y = L.para(
        "p0-b7",
        "Verlauf: Die Patientin wurde mit Fieber und Flankenschmerzen aufgenommen. Unter intravenöser "
        "Antibiose besserte sich der Zustand rasch. Kreatinin bei Entlassung 1,4 mg/dl.",
        "Course: The patient was admitted with fever and pain in the side. With intravenous antibiotics her "
        "condition improved quickly. Creatinine at discharge 1.4 mg/dl.",
        MARGIN,
        y + 22,
        BODY_W,
        font(size=23),
    )
    y = L.para(
        "p0-b8",
        "Medikation bei Entlassung:\nRamipril 5 mg 1-0-1-0 (unverändert)\nAmlodipin 5 mg 1-0-0-0 (neu)\n"
        "Cefuroxim 500 mg 1-0-1-0 bis einschließlich 12.10.2026 (neu)\nMetformin 1000 mg wurde pausiert.",
        "Medication at discharge:\nRamipril 5 mg 1-0-1-0 (unchanged)\nAmlodipine 5 mg 1-0-0-0 (new)\n"
        "Cefuroxime 500 mg 1-0-1-0 up to and including 12 October 2026 (new)\nMetformin 1000 mg has been paused.",
        MARGIN,
        y + 22,
        BODY_W,
        font(size=23),
    )
    y = L.para(
        "p0-b9",
        "Procedere: Bitte trinken Sie mindestens 2 Liter pro Tag. Metformin bitte erst nach Kontrolle der "
        "Nierenwerte wieder ansetzen. Wiedervorstellung beim Hausarzt am 15.10.2026 zur Kontrolle von "
        "Kreatinin und Blutzucker.",
        "Next steps: Please drink at least 2 litres per day. Restart Metformin only after the kidney values "
        "have been checked. Follow-up with the family doctor on 15 October 2026 to check creatinine and blood sugar.",
        MARGIN,
        y + 22,
        BODY_W,
        font(size=23),
    )
    y = L.para(
        "p0-b10",
        "Bei Fieber über 38,5 °C, starken Flankenschmerzen oder Verwirrtheit stellen Sie sich bitte sofort "
        "beim Hausarzt oder in der Notaufnahme vor.",
        "If you have a fever above 38.5 °C, strong pain in your side or confusion, see your family doctor or "
        "go to the emergency department immediately.",
        MARGIN,
        y + 22,
        BODY_W,
        font(bold=True, size=23),
    )
    L.para(
        "p0-b11",
        "Mit freundlichen kollegialen Grüßen\nProf. Dr. med. Thomas Berg, Dr. med. Lena Vogt",
        "With kind regards\nProf. Dr. Thomas Berg, Dr. Lena Vogt",
        MARGIN,
        y + 36,
        BODY_W,
        font(size=23),
    )

    L.item(
        "diagnosis",
        "high",
        "Kidney infection (Pyelonephritis)",
        "Akute Pyelonephritis rechts (N10)",
        "You had an infection of your right kidney. It caused fever and pain in your side.",
        "p0-b6",
        "Akute Pyelonephritis rechts (N10)",
    )
    L.item(
        "diagnosis",
        "medium",
        "High blood pressure (Hypertonie)",
        "Arterielle Hypertonie (I10.90)",
        "Your blood pressure is too high. Medicines help to keep it normal.",
        "p0-b6",
        "Arterielle Hypertonie (I10.90)",
    )
    L.item(
        "diagnosis",
        "medium",
        "Diabetes type 2 (Diabetes mellitus)",
        "Diabetes mellitus Typ 2 (E11.90)",
        "Your blood sugar is too high. This is a long-term illness.",
        "p0-b6",
        "Diabetes mellitus Typ 2 (E11.90)",
    )
    L.item(
        "appointment",
        "high",
        "Check-up at your family doctor",
        "15.10.2026",
        "Your doctor will check your kidneys and your blood sugar.",
        "p0-b9",
        "Wiedervorstellung beim Hausarzt am 15.10.2026",
        date="2026-10-15",
    )
    L.item(
        "warning_sign",
        "high",
        "Get help at once if…",
        "Fieber über 38,5 °C, starke Flankenschmerzen, Verwirrtheit",
        "If you get a fever over 38.5 degrees, strong pain in your side, or feel confused: see your doctor "
        "at once, or go to the emergency department.",
        "p0-b10",
        "Bei Fieber über 38,5 °C, starken Flankenschmerzen oder Verwirrtheit stellen Sie sich bitte sofort "
        "beim Hausarzt oder in der Notaufnahme vor.",
    )
    L.item(
        "instruction",
        "medium",
        "Drink enough",
        "mindestens 2 Liter pro Tag",
        "Drink at least 2 litres of water or tea every day. This helps your kidneys.",
        "p0-b9",
        "Bitte trinken Sie mindestens 2 Liter pro Tag.",
    )
    L.item(
        "instruction",
        "high",
        "Metformin: wait for your doctor",
        "erst nach Kontrolle der Nierenwerte",
        "Start Metformin again only when your doctor says so, after a kidney test.",
        "p0-b9",
        "Metformin bitte erst nach Kontrolle der Nierenwerte wieder ansetzen.",
    )
    L.item(
        "contact",
        "low",
        "Hospital ward 4B",
        "0123 4567-400",
        "Call this number if you have questions about your hospital stay.",
        "p0-b1",
        "Tel.: 0123 4567-400",
    )

    L.med(
        "p0-b8",
        "Ramipril 5 mg 1-0-1-0 (unverändert)",
        "Ramipril",
        strength="5 mg",
        doses=("1", "0", "1", "0"),
        status="continued",
        purpose="For your blood pressure.",
        instructions="Take one tablet in the morning and one in the evening.",
    )
    L.med(
        "p0-b8",
        "Amlodipin 5 mg 1-0-0-0 (neu)",
        "Amlodipin",
        strength="5 mg",
        doses=("1", "0", "0", "0"),
        status="new",
        purpose="New medicine for your blood pressure.",
        instructions="Take one tablet in the morning.",
    )
    L.med(
        "p0-b8",
        "Cefuroxim 500 mg 1-0-1-0 bis einschließlich 12.10.2026 (neu)",
        "Cefuroxim",
        strength="500 mg",
        doses=("1", "0", "1", "0"),
        schedule_text="bis einschließlich 12.10.2026",
        status="new",
        purpose="Antibiotic against the kidney infection.",
        instructions="Take one tablet in the morning and one in the evening, until 12 October 2026.",
    )
    L.med(
        "p0-b8",
        "Metformin 1000 mg wurde pausiert.",
        "Metformin",
        strength="1000 mg",
        status="stopped",
        purpose="For your blood sugar.",
        instructions="Do not take it for now. Your doctor will tell you when to start again.",
    )
    return L


def medikationsplan() -> Letter:
    L = Letter(
        id="medikationsplan",
        domain=PLAIN,
        description="Bundeseinheitlicher Medikationsplan (table) with weekly methotrexate and an as-needed "
        "medicine. Methotrexate safety note expected.",
        document_type="Medication plan (Medikationsplan)",
        document_class="medication_plan",
        sender="Family practice Dr. Anna Schmidt",
        summary="This is your medication plan. It shows which medicines you take, and when. "
        "You take six medicines regularly. You take two of them only once a week. "
        "You can take Paracetamol when you have pain.",
        action_steps=[
            "Take your medicines at the times shown in your daily plan.",
            "Take Methotrexat only on Mondays. Never take it every day.",
            "Take Folsäure only on Tuesdays.",
            "Take Pantoprazol before breakfast.",
            "Bring this plan to every doctor and to the pharmacy.",
        ],
        expected_findings=["safety"],
    )
    y = L.para("p0-b0", "Medikationsplan", "Medication plan", MARGIN - 40, 90, 600, font(bold=True, size=36))
    y = L.para(
        "p0-b1",
        "für: Erika Mustermann   geb. am: 12.03.1948\nausgedruckt von: Hausarztpraxis Dr. med. Anna Schmidt, "
        "Lindenstraße 8, 12345 Musterstadt, Tel.: 0123 98765\nausgedruckt am: 20.10.2026",
        "for: Erika Mustermann   born: 12 March 1948\nprinted by: Family practice Dr. Anna Schmidt, "
        "Lindenstraße 8, 12345 Musterstadt, Phone: 0123 98765\nprinted on: 20 October 2026",
        MARGIN - 40,
        y + 20,
        BODY_W + 80,
        font(size=21),
    )
    cols = [
        (90, 180),
        (275, 105),
        (385, 80),
        (470, 40),
        (515, 40),
        (560, 40),
        (605, 45),
        (660, 270),
        (940, 220),
    ]

    def cells(values):
        return [(v, x, w) for v, (x, w) in zip(values, cols)]

    y += 40
    L.draw.rectangle((80, y - 8, 1170, y + 36), fill=(225, 230, 236))
    y = L.row(
        "p0-b2",
        cells(["Wirkstoff", "Stärke", "Form", "Mo", "Mi", "Ab", "zN", "Hinweise", "Grund"]),
        y,
        "Active ingredient · Strength · Form · Morning · Noon · Evening · Night · Notes · Reason",
        f=font(bold=True, size=20),
    )
    rows = [
        (
            "p0-b3",
            ["Ramipril", "5 mg", "Tabl.", "1", "0", "1", "0", "", "Blutdruck"],
            "Ramipril · 5 mg · tablet · 1-0-1-0 · blood pressure",
        ),
        (
            "p0-b4",
            ["Amlodipin", "5 mg", "Tabl.", "1", "0", "0", "0", "", "Blutdruck"],
            "Amlodipine · 5 mg · tablet · 1-0-0-0 · blood pressure",
        ),
        (
            "p0-b5",
            ["Metformin", "1000 mg", "Tabl.", "½", "0", "½", "0", "zum Essen", "Diabetes"],
            "Metformin · 1000 mg · tablet · ½-0-½-0 · with meals · diabetes",
        ),
        (
            "p0-b6",
            ["Methotrexat", "15 mg", "Tabl.", "", "", "", "", "1x wöchentlich montags", "Rheuma"],
            "Methotrexate · 15 mg · tablet · once a week on Mondays · rheumatism",
        ),
        (
            "p0-b7",
            ["Folsäure", "5 mg", "Tabl.", "", "", "", "", "1x wöchentlich dienstags", "zu Methotrexat"],
            "Folic acid · 5 mg · tablet · once a week on Tuesdays · goes with methotrexate",
        ),
        (
            "p0-b8",
            ["Pantoprazol", "20 mg", "Tabl.", "1", "0", "0", "0", "vor dem Frühstück", "Magenschutz"],
            "Pantoprazole · 20 mg · tablet · 1-0-0-0 · before breakfast · stomach protection",
        ),
    ]
    for bid, values, tr in rows:
        y += 22
        L.draw.line((80, y - 10, 1170, y - 10), fill=(200, 200, 200))
        y = L.row(bid, cells(values), y, tr)
    y += 40
    y = L.para("p0-b9", "Bedarfsmedikation", "As-needed medication", 90, y, 600, font(bold=True, size=22))
    y += 14
    y = L.row(
        "p0-b10",
        cells(
            ["Paracetamol", "500 mg", "Tabl.", "", "", "", "", "bei Schmerzen, max. 4x täglich", "Schmerzen"]
        ),
        y,
        "Paracetamol · 500 mg · tablet · for pain, at most 4 times a day · pain",
    )
    y += 50
    L.para(
        "p0-b11",
        "Bitte bringen Sie diesen Plan zu jedem Arztbesuch und in die Apotheke mit.",
        "Please bring this plan to every doctor's appointment and to the pharmacy.",
        90,
        y,
        BODY_W + 40,
        font(size=22),
    )

    L.item(
        "instruction",
        "medium",
        "Bring this plan with you",
        "zu jedem Arztbesuch und in die Apotheke",
        "Show this plan to every doctor and at the pharmacy, so they know all your medicines.",
        "p0-b11",
        "Bitte bringen Sie diesen Plan zu jedem Arztbesuch und in die Apotheke mit.",
    )
    L.item(
        "contact",
        "low",
        "Your family doctor",
        "Tel.: 0123 98765",
        "Dr. Anna Schmidt made this plan. Call her if you have questions.",
        "p0-b1",
        "Tel.: 0123 98765",
    )

    def row_text(bid):
        return next(b["original"] for b in L.blocks if b["id"] == bid)

    L.med(
        "p0-b3",
        row_text("p0-b3"),
        "Ramipril",
        strength="5 mg",
        form="Tabl.",
        doses=("1", "0", "1", "0"),
        purpose="For your blood pressure.",
        instructions="One tablet in the morning and one in the evening.",
    )
    L.med(
        "p0-b4",
        row_text("p0-b4"),
        "Amlodipin",
        strength="5 mg",
        form="Tabl.",
        doses=("1", "0", "0", "0"),
        purpose="For your blood pressure.",
        instructions="One tablet in the morning.",
    )
    L.med(
        "p0-b5",
        row_text("p0-b5"),
        "Metformin",
        strength="1000 mg",
        form="Tabl.",
        doses=("½", "0", "½", "0"),
        purpose="For your blood sugar (diabetes).",
        instructions="Half a tablet in the morning and half in the evening, with food.",
    )
    L.med(
        "p0-b6",
        row_text("p0-b6"),
        "Methotrexat",
        strength="15 mg",
        form="Tabl.",
        schedule_text="1x wöchentlich montags",
        purpose="For your rheumatism.",
        instructions="One tablet once a week, on Mondays only. Never every day.",
    )
    L.med(
        "p0-b7",
        row_text("p0-b7"),
        "Folsäure",
        strength="5 mg",
        form="Tabl.",
        schedule_text="1x wöchentlich dienstags",
        purpose="A vitamin that goes with Methotrexat.",
        instructions="One tablet once a week, on Tuesdays.",
    )
    L.med(
        "p0-b8",
        row_text("p0-b8"),
        "Pantoprazol",
        strength="20 mg",
        form="Tabl.",
        doses=("1", "0", "0", "0"),
        purpose="Protects your stomach.",
        instructions="One tablet in the morning, before breakfast.",
    )
    L.med(
        "p0-b10",
        row_text("p0-b10"),
        "Paracetamol",
        strength="500 mg",
        form="Tabl.",
        schedule_text="bei Schmerzen, max. 4x täglich",
        purpose="For pain, only when you need it.",
        instructions="One tablet when you have pain. At most 4 tablets a day.",
    )
    return L
