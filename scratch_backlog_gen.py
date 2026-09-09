import os
import re
import json

screens_dir = r"C:\Users\ASUS\Desktop\CANVA ERP\figma\screens"
prds_dir = r"C:\Users\ASUS\Desktop\CANVA ERP\PRDS"
out_file = r"C:\Users\ASUS\Desktop\CANVA ERP\PRDS_BACKLOG.md"

def get_screens():
    screens = []
    for f in os.listdir(screens_dir):
        if f.endswith('.png'):
            screens.append(f)
    return screens

def get_prds():
    prds = []
    for f in os.listdir(prds_dir):
        if f.endswith('.md'):
            prds.append(f)
    return sorted(prds)

def parse_prd(prd_path):
    with open(prd_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We will just split by headings and try to extract bullets that look like features
    sections = {}
    current_heading = None
    for line in content.split('\n'):
        if line.startswith('## '):
            current_heading = line.strip('# ')
            sections[current_heading] = []
        elif line.startswith('### ') and current_heading:
            sections[current_heading].append({"subheading": line.strip('# '), "items": []})
        elif (line.strip().startswith('- ') or line.strip().startswith('* ')) and current_heading:
            if sections[current_heading] and isinstance(sections[current_heading][-1], dict):
                sections[current_heading][-1]["items"].append(line.strip('- *'))
            else:
                sections[current_heading].append(line.strip('- *'))
    return sections

screens = get_screens()
prds = get_prds()

# A rough mapping of screen names to modules
module_keywords = {
    "PRD-01": ["Auth", "User", "Admin", "Role", "Login"],
    "PRD-02": ["Work Order", "WO "],
    "PRD-03": ["Change Request", "CR "],
    "PRD-04": ["Quotation"],
    "PRD-05": ["BOM"],
    "PRD-06": ["Purchase Requisition", "PR ", "Purchase Order", "PO "],
    "PRD-07": ["Vendor"],
    "PRD-08": ["Stock", "Inventory"],
    "PRD-09": ["Job Card", "Production Dashboard", "EOD"],
    "PRD-10": ["OT", "Overtime"],
    "PRD-11": ["QC", "Quality", "Delivery"],
    "PRD-12": ["Billing", "Invoice"],
    "PRD-13": ["Finance"],
    "PRD-14": ["Attendance", "Payroll", "Holiday"],
    "PRD-15": ["Report", "MIS"],
    "PRD-16": ["Dashboard", "Notification"],
    "PRD-17": ["WhatsApp"]
}

screen_mapping = {prd: [] for prd in prds}
unmapped_screens = []

for screen in screens:
    mapped = False
    for prd in prds:
        prd_prefix = prd[:6] # "PRD-XX"
        if prd_prefix in module_keywords:
            for kw in module_keywords[prd_prefix]:
                if kw.lower() in screen.lower():
                    screen_mapping[prd].append(screen)
                    mapped = True
                    break
        if mapped:
            break
    if not mapped:
        unmapped_screens.append(screen)

with open(out_file, 'w', encoding='utf-8') as f:
    f.write("# CANVA ERP Master PRD Backlog\n\n")
    f.write("Generated based on `prd-backlog-mapper` skill rules.\n\n")
    
    for prd in prds:
        f.write(f"## Module: {prd.replace('.md', '')}\n\n")
        
        # Associated Screens
        assigned_screens = screen_mapping.get(prd, [])
        if assigned_screens:
            f.write("### Associated Screens\n")
            for sc in assigned_screens:
                f.write(f"- [ ] {sc}\n")
            f.write("\n")
            
        f.write("### UI Elements, Buttons & Validations\n")
        
        try:
            prd_data = parse_prd(os.path.join(prds_dir, prd))
            for heading, content in prd_data.items():
                if "feature" in heading.lower() or "ui" in heading.lower() or "requirement" in heading.lower() or "screen" in heading.lower() or "module" in heading.lower():
                    f.write(f"#### {heading}\n")
                    for item in content:
                        if isinstance(item, dict):
                            f.write(f"- **{item['subheading']}**\n")
                            for sub in item['items']:
                                if len(sub) > 10:
                                    f.write(f"  - [ ] NOT STARTED - {sub}\n")
                        else:
                            if len(item) > 10:
                                f.write(f"- [ ] NOT STARTED - {item}\n")
        except Exception as e:
            f.write(f"Error parsing PRD: {e}\n")
            
        f.write("\n---\n\n")
        
    if unmapped_screens:
        f.write("## Unmapped Screens\n")
        for sc in unmapped_screens:
            f.write(f"- [ ] {sc}\n")

print("Done generating backlog!")
