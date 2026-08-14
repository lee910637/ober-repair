"""
Excel 為主、App 唯讀：讀取 17108A-5-120_診斷資料.xlsx，產生 App 用的 diagnosis-data.json。
每次 Excel 更新後，重新執行本script即可重新發佈資料（不需改 App 程式碼）。

執行方式（需先安裝 openpyxl，例如 pip install openpyxl）：
    python build_data.py
"""
import json
import openpyxl

SRC = "17108A-5-120_診斷資料.xlsx"
OUT = "../data/diagnosis-data.json"


def sheet_rows(ws):
    rows = list(ws.iter_rows(values_only=True))
    headers = rows[0]
    out = []
    for r in rows[1:]:
        if r[0] is None:
            continue
        out.append({headers[i]: (r[i] if r[i] is not None else "") for i in range(len(headers))})
    return out


def parse_next(raw):
    """回傳 {'type': 'node', 'id': ...} 或 {'type': 'end', 'conclusion':..., 'action':...}"""
    raw = str(raw).strip()
    if not raw:
        return None
    if raw.startswith("END::"):
        parts = raw.split("::", 2)
        conclusion = parts[1] if len(parts) > 1 else ""
        action = parts[2] if len(parts) > 2 else ""
        return {"type": "end", "conclusion": conclusion, "action": action}
    return {"type": "node", "id": raw}


def main():
    wb = openpyxl.load_workbook(SRC, data_only=True)

    checks_by_id = {c["Check_ID"]: c for c in sheet_rows(wb["確認資訊"])}

    faults = []
    for f in sheet_rows(wb["異常資訊"]):
        faults.append({
            "id": f["Fault_ID"],
            "name": f["名稱"],
            "keywords": [k.strip() for k in str(f["關鍵字"]).split(",") if k.strip()],
            "category": f["類別"],
            "priority": f["優先等級"],
            "built": str(f["是否已建置"]).strip() == "是",
            "startNode": f["起始節點"] or None,
            "manualSection": f["手冊章節"],
            "description": f["說明"],
        })

    nodes = {}
    for n in sheet_rows(wb["判斷節點"]):
        check = checks_by_id.get(n["Check_ID"], {})
        options = []
        for i in (1, 2, 3):
            label = n.get(f"選項{i}文字")
            nxt = n.get(f"選項{i}下一步")
            if not label or not nxt:
                continue
            parsed = parse_next(nxt)
            if parsed:
                options.append({"label": label, "next": parsed})
        nodes[n["Node_ID"]] = {
            "id": n["Node_ID"],
            "faultId": n["Fault_ID"],
            "prompt": n["提示文字"],
            "check": {
                "location": check.get("檢查部位", ""),
                "method": check.get("檢查方法", ""),
                "normal": check.get("正常條件/標準值", ""),
                "unit": check.get("單位", ""),
            } if check else None,
            "options": options,
        }

    data = {"faults": faults, "nodes": nodes}
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    print(f"已產生 {OUT}：{len(faults)} 個故障項目、{len(nodes)} 個決策節點")


if __name__ == "__main__":
    main()
