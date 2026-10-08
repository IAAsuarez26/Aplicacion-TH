# -*- coding: utf-8 -*-
"""
Generador del Documento: CasoHumand.docx
Tema: Dictamen Técnico de Integración con Humand: Análisis de Eliminación de Datos,
      Semántica de Instrucciones (PUT vs PATCH vs POST/Push) y Matriz de Sincronización.
Autor: Dirección de Sistemas y Tecnología / Equipo TH
"""

import os
import shutil
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

# Paleta Corporativa Ponce & Benzo
COLOR_NAVY_HEX = "1B365D"       # Azul Marino Primario
COLOR_BLUE_HEX = "2B6CB0"       # Azul Medio Corporativo
COLOR_ACCENT_HEX = "D97706"     # Ámbar Alerta / Atención
COLOR_GREEN_HEX = "2F855A"      # Verde Éxito / Seguro
COLOR_RED_HEX = "C53030"        # Rojo Peligro / Destructivo
COLOR_BG_LIGHT_HEX = "F8FAFC"   # Fondo tarjeta suave
COLOR_BG_WARN_HEX = "FFFBEB"    # Fondo advertencia
COLOR_BG_ALERT_HEX = "FEF2F2"   # Fondo alerta
COLOR_BG_HEADER_HEX = "1B365D"  # Fondo encabezado tabla
COLOR_BORDER_HEX = "CBD5E1"     # Borde sutil slate

COLOR_NAVY = RGBColor(27, 54, 93)
COLOR_BLUE = RGBColor(43, 108, 176)
COLOR_TEXT_MAIN = RGBColor(30, 41, 59)
COLOR_TEXT_MUTED = RGBColor(100, 116, 139)
COLOR_WHITE = RGBColor(255, 255, 255)
COLOR_RED = RGBColor(197, 48, 48)
COLOR_GREEN = RGBColor(47, 133, 90)
COLOR_BORDER = RGBColor(203, 213, 225)

def set_cell_background(cell, hex_color):
    shading_xml = f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>'
    cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))

def set_cell_margins(cell, top=140, bottom=140, left=180, right=180):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}>'
                      f'<w:top w:w="{top}" w:type="dxa"/>'
                      f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
                      f'<w:left w:w="{left}" w:type="dxa"/>'
                      f'<w:right w:w="{right}" w:type="dxa"/>'
                      f'</w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, color="CBD5E1", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders_xml = f'''
    <w:tblBorders {nsdecls("w")}>
        <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
        <w:left w:val="none"/>
        <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
        <w:right w:val="none"/>
        <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
        <w:insideV w:val="none"/>
    </w:tblBorders>
    '''
    tblPr.append(parse_xml(borders_xml))

def add_header_decor(doc):
    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run_meta = p_meta.add_run("PONCE & BENZO | DIRECCIÓN DE SISTEMAS Y TECNOLOGÍA\nGERENCIA CORPORATIVA DE TALENTO HUMANO")
    run_meta.font.name = "Calibri"
    run_meta.font.size = Pt(8.5)
    run_meta.font.bold = True
    run_meta.font.color.rgb = COLOR_TEXT_MUTED

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run("CASO HUMAND: DICTAMEN TÉCNICO DE INTEGRACIÓN")
    run.font.name = "Calibri"
    run.font.size = Pt(22)
    run.font.bold = True
    run.font.color.rgb = COLOR_NAVY

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(16)
    run_sub = p_sub.add_run("Análisis Causa Raíz de Pérdida de Información, Semántica PUT / PATCH / POST y Protocolo de Sincronización")
    run_sub.font.name = "Calibri"
    run_sub.font.size = Pt(12)
    run_sub.font.color.rgb = COLOR_BLUE

    # Línea divisoria
    p_line = doc.add_paragraph()
    p_line.paragraph_format.space_after = Pt(14)
    pPr = p_line._p.get_or_add_pPr()
    pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="18" w:space="2" w:color="{COLOR_NAVY_HEX}"/></w:pBdr>')
    pPr.append(pBdr)

def add_heading_styled(doc, text, level=1):
    p = doc.add_paragraph()
    p.paragraph_format.keep_with_next = True
    
    if level == 1:
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(6)
        run = p.add_run(text)
        run.bold = True
        run.font.name = "Calibri"
        run.font.size = Pt(14)
        run.font.color.rgb = COLOR_NAVY
        pPr = p._p.get_or_add_pPr()
        pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="10" w:space="4" w:color="{COLOR_BLUE_HEX}"/></w:pBdr>')
        pPr.append(pBdr)
    elif level == 2:
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(text)
        run.bold = True
        run.font.name = "Calibri"
        run.font.size = Pt(12)
        run.font.color.rgb = COLOR_BLUE
    elif level == 3:
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(text)
        run.bold = True
        run.font.name = "Calibri"
        run.font.size = Pt(10.5)
        run.font.color.rgb = COLOR_TEXT_MAIN

def add_body_paragraph(doc, text, bold_prefix=None, space_after=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.bold = True
        r_pre.font.name = "Calibri"
        r_pre.font.size = Pt(10)
        r_pre.font.color.rgb = COLOR_TEXT_MAIN
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(10)
    run.font.color.rgb = COLOR_TEXT_MAIN
    return p

def add_bullet(doc, text, bold_prefix=None):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.bold = True
        r_pre.font.name = "Calibri"
        r_pre.font.size = Pt(10)
        r_pre.font.color.rgb = COLOR_TEXT_MAIN
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(10)
    run.font.color.rgb = COLOR_TEXT_MAIN

def add_callout(doc, title, text, border_color_hex=COLOR_BLUE_HEX, bg_color_hex=COLOR_BG_LIGHT_HEX):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.rows[0].cells[0]
    cell.width = Inches(6.5)
    set_cell_background(cell, bg_color_hex)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)

    tblPr = tbl._tbl.tblPr
    borders_xml = f'''
    <w:tblBorders {nsdecls("w")}>
        <w:top w:val="none"/>
        <w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color_hex}"/>
        <w:bottom w:val="none"/>
        <w:right w:val="none"/>
        <w:insideH w:val="none"/>
        <w:insideV w:val="none"/>
    </w:tblBorders>
    '''
    tblPr.append(parse_xml(borders_xml))

    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(3)
    r_title = p.add_run(title)
    r_title.bold = True
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(10.5)
    r_title.font.color.rgb = COLOR_NAVY if border_color_hex != COLOR_RED_HEX else COLOR_RED

    p_body = cell.add_paragraph()
    p_body.paragraph_format.space_after = Pt(0)
    p_body.paragraph_format.line_spacing = 1.15
    r_text = p_body.add_run(text)
    r_text.font.name = "Calibri"
    r_text.font.size = Pt(9.5)
    r_text.font.color.rgb = COLOR_TEXT_MAIN

    p_space = doc.add_paragraph()
    p_space.paragraph_format.space_after = Pt(6)

def style_table_header(row, col_widths=None):
    for i, cell in enumerate(row.cells):
        set_cell_background(cell, COLOR_NAVY_HEX)
        set_cell_margins(cell, top=130, bottom=130, left=140, right=140)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        if col_widths and i < len(col_widths):
            cell.width = col_widths[i]
        for p in cell.paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.font.name = "Calibri"
                r.font.size = Pt(9.5)
                r.font.bold = True
                r.font.color.rgb = COLOR_WHITE

def style_table_rows(table, col_widths=None, alternate_bg=True):
    for r_idx, row in enumerate(table.rows[1:]):
        bg = COLOR_BG_LIGHT_HEX if (alternate_bg and r_idx % 2 == 1) else "FFFFFF"
        for c_idx, cell in enumerate(row.cells):
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            if col_widths and c_idx < len(col_widths):
                cell.width = col_widths[c_idx]
            for p in cell.paragraphs:
                p.paragraph_format.space_after = Pt(0)
                p.paragraph_format.line_spacing = 1.1
                for r in p.runs:
                    r.font.name = "Calibri"
                    r.font.size = Pt(9)
                    r.font.color.rgb = COLOR_TEXT_MAIN

def generate_document():
    doc = docx.Document()

    # Márgenes estándar
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # -------------------------------------------------------------------------
    # PORTADA / ENCABEZADO
    # -------------------------------------------------------------------------
    add_header_decor(doc)

    # Ficha Técnica
    ficha_table = doc.add_table(rows=5, cols=2)
    ficha_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_widths = [Inches(2.2), Inches(4.3)]
    set_table_borders(ficha_table)

    metadata_items = [
        ("Código de Asunto:", "CASO-HUMAND-2026-001"),
        ("Tipo de Documento:", "Dictamen Técnico de Arquitectura y Guía Operativa"),
        ("Sistemas Involucrados:", "Aplicación TH (PostgreSQL/InsForge) ↔ Humand Public API v1"),
        ("Incidencia Reportada:", "Eliminación / Blanqueo no intencionado de datos preexistentes en Humand"),
        ("Audiencia Destinataria:", "Gerencia de Talento Humano, Analistas de TH, Dirección de Sistemas y Tecnología"),
    ]

    for idx, (label, val) in enumerate(metadata_items):
        row = ficha_table.rows[idx]
        cell_lbl, cell_val = row.cells[0], row.cells[1]
        set_cell_background(cell_lbl, COLOR_BG_LIGHT_HEX)
        set_cell_background(cell_val, "FFFFFF")
        set_cell_margins(cell_lbl, top=90, bottom=90, left=130, right=130)
        set_cell_margins(cell_val, top=90, bottom=90, left=130, right=130)
        cell_lbl.width, cell_val.width = col_widths[0], col_widths[1]

        p0 = cell_lbl.paragraphs[0]
        p0.paragraph_format.space_after = Pt(0)
        r0 = p0.add_run(label)
        r0.font.name, r0.font.size, r0.font.bold = "Calibri", Pt(9), True
        r0.font.color.rgb = COLOR_NAVY

        p1 = cell_val.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run(val)
        r1.font.name, r1.font.size = "Calibri", Pt(9)
        r1.font.color.rgb = COLOR_TEXT_MAIN

    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_after = Pt(12)

    # -------------------------------------------------------------------------
    # 1. RESUMEN EJECUTIVO Y CAUSA RAÍZ
    # -------------------------------------------------------------------------
    add_heading_styled(doc, "1. Resumen Ejecutivo y Causa Raíz del Incidente", level=1)

    add_body_paragraph(
        doc,
        "El presente informe da respuesta formal y técnica a la incidencia detectada recientemente durante el proceso de integración entre la Aplicación de Talento Humano (TH) y la plataforma Humand, en la cual se reportó la eliminación o blanqueo no deseado de ciertos atributos en los perfiles de los colaboradores."
    )

    add_callout(
        doc,
        "DICTAMEN DE CAUSA RAÍZ: COMPORTAMIENTO DESTRUCTIVO DE 'PUT /users'",
        "El incidente fue causado por la ejecución de la modalidad de 'Sincronización en Cascada' sobre empleados que ya existían previamente en Humand. En dicha modalidad se dispara la instrucción HTTP PUT /users, la cual, por especificación arquitectónica del estándar REST y de la API oficial de Humand, realiza un 'Reemplazo Completo' (Full Entity Replacement). En consecuencia, cualquier campo que en la Aplicación TH estuviese en blanco, en null o no enviado en el JSON, fue interpretado por Humand como una orden de blanqueo o reseteo a su valor por defecto.",
        border_color_hex=COLOR_RED_HEX,
        bg_color_hex=COLOR_BG_ALERT_HEX
    )

    add_body_paragraph(
        doc,
        "Factores específicos que desencadenaron la pérdida de información en el perfil del usuario:",
        bold_prefix="Factores Detallados: "
    )
    add_bullet(doc, "Reemplazo de la entidad completa: PUT /users no conserva atributos que no figuren en la petición. Si un colaborador tenía en Humand su foto de perfil, un número celular particular o datos introducidos manualmente que no estaban en la base de datos de TH, el endpoint PUT los eliminó.", bold_prefix="1. Atributos no mapeados en TH: ")
    add_bullet(doc, "Relaciones Jerárquicas vacías: En el aprovisionamiento PUT, si el colaborador no tenía supervisor directo asignado en TH, el sistema enviaba 'relationships: []'. Humand interpretó dicho arreglo vacío como la instrucción de desvincular al jefe inmediato preexistente.", bold_prefix="2. Ruptura de organigrama (BOSS): ")
    add_bullet(doc, "Campos opcionales con valor null: Si la fecha de nacimiento o el teléfono estaban nulos en TH al momento de correr la cascada, el payload envió valores null que sobreescribieron los datos previos que el colaborador hubiese registrado en Humand.", bold_prefix="3. Sobrescritura de nulos: ")
    add_bullet(doc, "Contraseña temporal reasignada: Al ejecutar PUT /users, se reinyecta una clave provisional por defecto ('PasswordTemp2026!'), lo cual puede afectar las sesiones activas si la cuenta ya estaba reclamada.", bold_prefix="4. Reseteo de credenciales: ")

    # -------------------------------------------------------------------------
    # 2. COMPARATIVA DE INSTRUCCIONES: PUT vs PATCH vs POST ("Push")
    # -------------------------------------------------------------------------
    add_heading_styled(doc, "2. Semántica de Instrucciones: PUT vs PATCH vs POST (\"Push\")", level=1)

    add_body_paragraph(
        doc,
        "En el diseño de interfaces de programación de aplicaciones (APIs REST), cada verbo HTTP posee una semántica y un alcance operacional estrictamente regulado. Frecuentemente se utiliza el término coloquial 'Push' para referirse al acto de enviar datos hacia Humand, pero en el estándar técnico dicho envío se realiza mediante POST, PUT o PATCH. Es crucial comprender la diferencia:"
    )

    # Tabla Comparativa de Verbos
    verb_table = doc.add_table(rows=4, cols=5)
    verb_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    v_widths = [Inches(1.1), Inches(1.5), Inches(1.5), Inches(1.2), Inches(1.2)]
    set_table_borders(verb_table)

    headers_verb = ["Método HTTP", "Endpoint Humand", "Comportamiento", "Campos Omitidos", "Nivel de Riesgo"]
    for i, h in enumerate(headers_verb):
        verb_table.rows[0].cells[i].paragraphs[0].text = h
    style_table_header(verb_table.rows[0], v_widths)

    verbs_data = [
        ("PUT\n(Reemplazo Total)", "PUT /users", "Full Upsert. Si no existe, lo crea. Si existe, reemplaza y reescribe toda la entidad.", "Se sobreescriben a null o valor default. ¡Se borran!", "ALTO\n(Destructivo en existentes)"),
        ("PATCH\n(Actualización Delta)", "PATCH /users/{id}\nPATCH /users/{id}/profile-fields", "Actualización Parcial. Modifica únicamente los campos enviados en el cuerpo JSON.", "Quedan 100% intactos en Humand.", "NULO\n(Seguro e Inocuo)"),
        ("POST\n(Creación / Acción)", "POST /departments/bulk\nPOST /job-positions/bulk\nPOST /segmentations/users\nPOST /users/{id}/deactivate", "Creación de nuevos recursos específicos o ejecución de acciones operativas (bajas, segmentar).", "No aplica sobreescritura de usuario base.", "CONTROLADO\n(Específico al endpoint)"),
    ]

    for r_idx, row_data in enumerate(verbs_data):
        row = verb_table.rows[r_idx + 1]
        for c_idx, val in enumerate(row_data):
            row.cells[c_idx].paragraphs[0].text = val
    style_table_rows(verb_table, v_widths)

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(8)

    add_body_paragraph(
        doc,
        "¿Por qué se utilizó originalmente PUT /users para los usuarios?",
        bold_prefix="Nota Técnica sobre Correos de Bienvenida: "
    )
    add_body_paragraph(
        doc,
        "La API de Humand tiene una regla particular en el endpoint POST /users: si se utiliza POST para crear a un colaborador y este tiene configurado el campo email, la plataforma Humand DISPARA INMEDIATAMENTE un correo automático de bienvenida al buzón del empleado. Durante fases de prueba, desarrollo o sincronización masiva de nómina, esto provocaría que cientos de empleados reciban invitaciones prematuras. Por esta razón, la arquitectura canónica de Humand estipula usar PUT /users para el aprovisionamiento inicial, ya que PUT opera de manera silenciosa (no envía correos). Sin embargo, PUT sólo debe utilizarse la primera vez (alta inicial)."
    )

    # -------------------------------------------------------------------------
    # 3. LOS DOS MODOS DE SINCRONIZACIÓN EN APLICACIÓN TH
    # -------------------------------------------------------------------------
    add_heading_styled(doc, "3. Arquitectura del Sistema: Los Dos Modos de Sincronización", level=1)

    add_body_paragraph(
        doc,
        "En la Aplicación TH, el módulo de integración (src/lib/humandSyncService.ts y src/components/humand/HumandSyncModal.tsx) cuenta con dos motores claramente diferenciados en la interfaz de usuario:"
    )

    add_heading_styled(doc, "3.1 Modo A: Sincronización Selectiva por Campos (Delta PATCH)", level=2)
    add_body_paragraph(
        doc,
        "Diseñado para el mantenimiento continuo y la actualización periódica de la nómina activa. Este modo ofrece Garantía Absoluta de Inocuidad, ya que opera bajo el verbo PATCH."
    )
    add_bullet(doc, "PATCH /users/{employeeInternalId}: Actualiza exclusivamente los campos base seleccionados (Fecha de Nacimiento 'birthdate', Teléfono 'phoneNumber', Fecha de Ingreso 'hiringDate', Correo Electrónico 'email', Supervisor Directo 'relationships BOSS').", bold_prefix="Atributos Base: ")
    add_bullet(doc, "PATCH /users/{employeeInternalId}/profile-fields: Modifica dinámicamente los campos extendidos de perfil mediante sus UUIDs oficiales (Estado Civil y Nivel Educativo). Preserva todos los demás campos personalizados.", bold_prefix="Perfil Extendido: ")
    add_bullet(doc, "POST /segmentations/users: Asocia al usuario a sus grupos organizacionales de segmentación (Ubicación Geográfica y Género) de manera acumulativa y segura.", bold_prefix="Segmentaciones: ")

    add_callout(
        doc,
        "VENTAJAS DE LA SINCRONIZACIÓN SELECTIVA (PATCH)",
        "1. Cero riesgo de pérdida de datos: Lo que no esté marcado con un check, Humand ni siquiera lo lee ni lo altera.\n2. Preservación del estado de la cuenta: No toca contraseñas, no altera fotos de perfil ni resetea estatus.\n3. Eficiencia y ligereza: Consume una sola petición HTTP ultraligera por colaborador, minimizando el consumo de cuota de Rate Limiting (50 req/min).",
        border_color_hex=COLOR_GREEN_HEX,
        bg_color_hex=COLOR_BG_LIGHT_HEX
    )

    add_heading_styled(doc, "3.2 Modo B: Sincronización en Cascada Completa (Structural PUT)", level=2)
    add_body_paragraph(
        doc,
        "Diseñado originalmente como un flujo integral de despliegue de 5 pasos consecutivos:"
    )
    add_bullet(doc, "Paso 1: Consulta y alta en lote de Departamentos en Humand (POST /departments/bulk) si no existen.", bold_prefix="Estructura Dptos: ")
    add_bullet(doc, "Paso 2: Consulta y alta en lote de Puestos / Cargos en Humand (POST /job-positions/bulk) si no existen.", bold_prefix="Estructura Cargos: ")
    add_bullet(doc, "Paso 3: Aprovisionamiento estructural del usuario con reemplazo integral (PUT /users).", bold_prefix="Usuario Core: ")
    add_bullet(doc, "Paso 4: Asignación de membresías formales (PUT /departments/members/{id} y PUT /job-positions/members/{id}).", bold_prefix="Membresías: ")
    add_bullet(doc, "Paso 5: Registro de segmentaciones y campos extendidos de perfil.", bold_prefix="Ficha Final: ")

    add_body_paragraph(
        doc,
        "Debido a que el Paso 3 invoca PUT /users, esta modalidad NO DEBE UTILIZARSE para modificar datos de colaboradores que ya están activos y habitando la plataforma Humand. Su único caso de uso válido es el alta de colaboradores completamente nuevos (nuevos ingresos) que no poseen ficha previa en Humand."
    )

    # -------------------------------------------------------------------------
    # 4. MATRIZ DE OPERACIONES: ¿CUÁL INSTRUCCIÓN EJECUTAR EN CADA CASO?
    # -------------------------------------------------------------------------
    add_heading_styled(doc, "4. Matriz de Operaciones y Casos de Uso", level=1)

    add_body_paragraph(
        doc,
        "A continuación se establece la guía taxativa de qué instrucción, endpoint y pestaña de la aplicación debe ejecutarse para cada evento del ciclo de vida del colaborador:"
    )

    # Tabla Matriz de Casos
    matrix_table = doc.add_table(rows=9, cols=5)
    matrix_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    m_widths = [Inches(1.8), Inches(1.1), Inches(1.4), Inches(1.2), Inches(1.0)]
    set_table_borders(matrix_table)

    headers_m = ["Caso de Uso Operativo", "Tipo Empleado", "Instrucción API", "Pestaña / Modo", "Riesgo Datos"]
    for i, h in enumerate(headers_m):
        matrix_table.rows[0].cells[i].paragraphs[0].text = h
    style_table_header(matrix_table.rows[0], m_widths)

    matrix_data = [
        ("Actualizar Fechas de Nacimiento\n(Campaña Cumpleaños)", "Existente en Humand", "PATCH /users/{id}", "Sincronización Selectiva\n(Preset: 'Solo Nacimiento')", "NULO (Seguro)"),
        ("Actualizar Teléfono o Correo", "Existente en Humand", "PATCH /users/{id}", "Sincronización Selectiva\n(Preset: 'Personales')", "NULO (Seguro)"),
        ("Cambio de Supervisor Directo\n(Reorganigrama BOSS)", "Existente en Humand", "PATCH /users/{id}", "Sincronización Selectiva\n(Preset: 'Laborales')", "NULO (Seguro)"),
        ("Actualizar Estado Civil o Nivel Educativo", "Existente en Humand", "PATCH /users/{id}/profile-fields", "Sincronización Selectiva\n(Checks de Perfil)", "NULO (Seguro)"),
        ("Asignar Ubicación o Género\n(Segmentación)", "Existente en Humand", "POST /segmentations/users", "Sincronización Selectiva\n(Check: 'Segmentaciones')", "NULO (Seguro)"),
        ("Nuevo Ingreso (Onboarding)\nColaborador sin cuenta en Humand", "NUEVO\n(No existe)", "PUT /users +\nPUT /members", "Sincronización en Cascada\n(Completa)", "NINGUNO\n(Es un alta)"),
        ("Re-sincronización Masiva Forzada\n(Reemplazo total)", "Existente en Humand", "PUT /users (Cascada)", "Sincronización en Cascada\n(Completa)", "ALTO RIESGO\n(Sobrescribe)"),
        ("Desincorporación / Egreso Formal\n(Baja de la empresa)", "Existente en Humand", "POST /users/{id}/deactivate", "Proceso de Baja\n(Offboarding)", "SEGURO\n(Inactiva cuenta)"),
    ]

    for r_idx, row_data in enumerate(matrix_data):
        row = matrix_table.rows[r_idx + 1]
        for c_idx, val in enumerate(row_data):
            row.cells[c_idx].paragraphs[0].text = val
    style_table_rows(matrix_table, m_widths)

    p_sp2 = doc.add_paragraph()
    p_sp2.paragraph_format.space_after = Pt(10)

    # -------------------------------------------------------------------------
    # 5. ALINEACIÓN CON EL EQUIPO TÉCNICO DE HUMAND Y AJUSTES DE SOFTWARE
    # -------------------------------------------------------------------------
    add_heading_styled(doc, "5. Alineación con el Equipo Técnico de Humand y Ajustes de Software", level=1)

    add_body_paragraph(
        doc,
        "Tras la interlocución directa con el equipo técnico de Humand, se ratificaron y consensuaron formalmente las siguientes tres reglas canónicas para la invocación de la API:"
    )

    add_callout(
        doc,
        "DIRECTRIZ DEFINIDA POR EL EQUIPO TÉCNICO DE HUMAND",
        "• POST: Reservado para CREAR usuarios nuevos en Humand que aún no existen en la plataforma.\n• PATCH: Reservado para ACTUALIZAR campos puntuales en usuarios existentes, garantizando que los datos no transmitidos permanezcan 100% intactos.\n• PUT: Reservado para REEMPLAZAR el usuario completo. Esta instrucción sobrescribe todo y, si un campo no se pasa, se borra. Debe usarse con extremo cuidado y solo cuando se requiere reemplazo total deliberado.",
        border_color_hex=COLOR_NAVY_HEX,
        bg_color_hex=COLOR_BG_WARN_HEX
    )

    add_heading_styled(doc, "5.1 Brecha Identificada en la Versión Anterior del Software", level=2)
    add_body_paragraph(
        doc,
        "La evaluación técnica del código fuente reveló que la aplicación presentaba dos discrepancias respecto a la directriz de Humand:"
    )
    add_bullet(doc, "Para la creación de nuevos usuarios, la aplicación ejecutaba PUT /users en lugar de POST /users (herencia de la premisa de silenciar correos de bienvenida).", bold_prefix="1. Ausencia de POST /users: ")
    add_bullet(doc, "La Sincronización en Cascada invocaba PUT /users de forma ciega, sin comprobar primero si el colaborador ya estaba registrado en Humand, lo cual provocó el blanqueo de información en colaboradores activos.", bold_prefix="2. Falta de Detección Pre-Vuelo: ")

    add_heading_styled(doc, "5.2 Ajustes Arquitectónicos Implementados en la Aplicación TH", level=2)
    add_body_paragraph(
        doc,
        "Para subsanar definitivamente la situación y garantizar que nunca más se produzca un borrado accidental, se aplicaron las siguientes modificaciones en el motor de sincronización (src/lib/humandSyncService.ts y src/components/humand/HumandSyncModal.tsx):"
    )
    add_bullet(doc, "Se añadió el endpoint POST /users mediante la función humandApi.createUser(payload), asegurando que las altas formales utilicen el método estándar de creación estipulado por Humand.", bold_prefix="A. Incorporación del Método POST /users: ")
    add_bullet(doc, "Antes de emitir cualquier petición mutativa, el motor ejecuta una consulta GET /users/{cedula} para determinar con certeza si el colaborador existe o no en Humand.", bold_prefix="B. Detección Automática de Existencia (Pre-Flight Check): ")
    add_bullet(doc, "Bifurcación Inteligente (Smart Sync):\n   • Si el usuario NO existe (HTTP 404): El sistema ejecuta automáticamente POST /users para crearlo limpiamente.\n   • Si el usuario YA existe (HTTP 200): El sistema conmuta automáticamente a PATCH /users/{cedula}, actualizando únicamente los datos enviados desde TH y preservando la totalidad de los datos preexistentes en Humand (fotos, teléfonos, contraseñas, etc.).", bold_prefix="C. Motor 'Smart Sync' Condicional: ")
    add_bullet(doc, "La instrucción PUT /users fue desvinculada del flujo ordinario de sincronización y confinada exclusivamente bajo una confirmación explícita de seguridad con advertencia en rojo.", bold_prefix="D. Confinamiento de Seguridad de PUT /users: ")
    add_bullet(doc, "La interfaz gráfica ahora detecta y muestra el estatus del colaborador en Humand ('Nuevo' o 'Existente'), informando en pantalla la acción exacta a realizar (POST o PATCH).", bold_prefix="E. Visibilidad y Transparencia en Pantalla: ")

    # -------------------------------------------------------------------------
    # 6. PROTOCOLO OPERATIVO Y RECOMENDACIONES DE SEGURIDAD
    # -------------------------------------------------------------------------
    add_heading_styled(doc, "6. Protocolo de Seguridad Operativa y Buenas Prácticas", level=1)

    add_body_paragraph(
        doc,
        "A fin de garantizar que ningún registro vuelva a ser alterado o blanqueado de forma imprevista, se establecen las siguientes directrices obligatorias para todo el equipo operativo y de desarrollo:"
    )

    add_callout(
        doc,
        "REGLA DE ORO DE SINCRONIZACIÓN",
        "SI EL COLABORADOR YA EXISTE EN HUMAND:\nNUNCA utilizar reemplazo total (PUT).\nEl sistema utilizará siempre ACTUALIZACIÓN PARCIAL (PATCH).\nPara colaboradores NUEVOS, el sistema ejecutará CREACIÓN FORMAL (POST).",
        border_color_hex=COLOR_NAVY_HEX,
        bg_color_hex=COLOR_BG_LIGHT_HEX
    )

    add_heading_styled(doc, "Directrices Específicas de Ejecución:", level=2)
    add_bullet(doc, "Antes de disparar una sincronización masiva en lote, marque siempre el interruptor 'Simulación (Dry-Run)'. Esto permite que el sistema evalúe a cada colaborador, verifique la cédula y genere la bitácora previa sin emitir una sola llamada destructiva a la API.", bold_prefix="1. Uso Mandatorio de Simulación (Dry-Run): ")
    add_bullet(doc, "Utilice los botones rápidos de preset ubicados en la parte superior ('Solo Nacimiento', 'Personales', 'Laborales') para marcar únicamente los atributos objetivo y desmarcar automáticamente todo lo demás.", bold_prefix="2. Selección Quirúrgica por Presets: ")
    add_bullet(doc, "Cuando un colaborador es promovido de cargo o transferido de departamento, la vía segura consiste en utilizar los endpoints específicos de membresía (PUT /departments/members/{id} y PUT /job-positions/members/{id}) sin tocar la ficha base del usuario con PUT /users.", bold_prefix="3. Movimientos Estructurales Aislados: ")

    # -------------------------------------------------------------------------
    # 7. CONCLUSIÓN Y CIERRE TÉCNICO
    # -------------------------------------------------------------------------
    add_heading_styled(doc, "7. Conclusión", level=1)
    add_body_paragraph(
        doc,
        "Con los ajustes arquitectónicos implementados, la Aplicación TH queda 100% alineada con las condiciones técnicas fijadas por el equipo de Humand: POST para altas nuevas, PATCH para mantenimiento continuo e inocuo, y PUT estrictamente confinado. De esta manera, el sistema queda permanentemente blindado contra cualquier pérdida o blanqueo involuntario de datos."
    )

    # Bloque de Firmas
    p_sig_sp = doc.add_paragraph()
    p_sig_sp.paragraph_format.space_before = Pt(24)

    sig_table = doc.add_table(rows=1, cols=2)
    sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    s_widths = [Inches(3.2), Inches(3.2)]
    set_table_borders(sig_table, color="FFFFFF", val="none")

    c0 = sig_table.rows[0].cells[0]
    c1 = sig_table.rows[0].cells[1]
    c0.width, c1.width = s_widths[0], s_widths[1]

    p_s0 = c0.paragraphs[0]
    p_s0.paragraph_format.line_spacing = 1.15
    p_s0.add_run("_________________________________________\n").font.color.rgb = COLOR_BORDER
    r_s0_1 = p_s0.add_run("Ing. Albin Suárez / Equipo de Desarrollo\n")
    r_s0_1.bold = True
    r_s0_1.font.size = Pt(9.5)
    r_s0_1.font.color.rgb = COLOR_NAVY
    r_s0_2 = p_s0.add_run("Dirección de Sistemas y Tecnología\nPonce & Benzo S.A.")
    r_s0_2.font.size = Pt(8.5)
    r_s0_2.font.color.rgb = COLOR_TEXT_MUTED

    p_s1 = c1.paragraphs[0]
    p_s1.paragraph_format.line_spacing = 1.15
    p_s1.add_run("_________________________________________\n").font.color.rgb = COLOR_BORDER
    r_s1_1 = p_s1.add_run("Gerencia Corporativa de Talento Humano\n")
    r_s1_1.bold = True
    r_s1_1.font.size = Pt(9.5)
    r_s1_1.font.color.rgb = COLOR_NAVY
    r_s1_2 = p_s1.add_run("Aprobación Operativa y Gobierno de Datos\nPonce & Benzo S.A.")
    r_s1_2.font.size = Pt(8.5)
    r_s1_2.font.color.rgb = COLOR_TEXT_MUTED

    # Guardar en rutas designadas
    output_dir_docs = os.path.join(os.path.dirname(__file__), "..", "documentos")
    os.makedirs(output_dir_docs, exist_ok=True)
    path_docs = os.path.join(output_dir_docs, "CasoHumand.docx")
    doc.save(path_docs)
    print(f"[OK] Archivo generado en: {path_docs}")

    # Guardar también en la raíz del proyecto para acceso directo
    path_root = os.path.join(os.path.dirname(__file__), "..", "CasoHumand.docx")
    shutil.copyfile(path_docs, path_root)
    print(f"[OK] Copia idéntica colocada en raíz: {path_root}")

if __name__ == "__main__":
    generate_document()
