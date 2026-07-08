# GemGem 리드 랜딩 + 폼

- 공개 URL: https://jeklinkimm.github.io/gemgem/
- 스텝형 폼 (문항별 Mixpanel 이벤트 → 이탈 퍼널 분석 가능)
- 분기: "어떤 분이세요?" → 센터 트랙(6문항) / 보호자 트랙(3문항)

## 설정 2개 (index.html 상단 CONFIG)

### 1. MIXPANEL_TOKEN
Mixpanel → 프로젝트 설정 → Project Token 복사 → `CONFIG.MIXPANEL_TOKEN`에 붙여넣기.

이벤트 설계:
| 이벤트 | 의미 |
|---|---|
| `lead_view` | 페이지 도달 (utm_source/utm_content 자동 포함) |
| `lead_start` | 첫 문항 렌더 = 폼 시작 |
| `lead_step` | 문항 통과 (step_id, step_name, step_number, track) |
| `lead_submit` | 제출 (전체 응답 포함 — 시트 웹훅 없어도 여기서 복구 가능) |

Mixpanel Funnels: `lead_view → lead_start → lead_step(step_id=role) → lead_submit`
문항별 이탈: `lead_step`을 step_id로 breakdown.

### 2. SHEETS_WEBHOOK (응답 → 구글시트, 3분)
1. sheets.new → 새 스프레드시트 → 확장 프로그램 → Apps Script
2. 아래 코드 붙여넣기 → 배포 → 새 배포 → 유형: 웹 앱 → 액세스: **모든 사용자** → 배포
3. 웹 앱 URL 복사 → `CONFIG.SHEETS_WEBHOOK`에 붙여넣기

```javascript
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const d = JSON.parse(e.postData.contents);
  const cols = ["submitted_at","track","name","phone","channel","role","org","region",
                "orgtype","kids","demo","ask","age","center","news","utm_source","utm_content"];
  if (ss.getLastRow() === 0) ss.appendRow(cols);
  ss.appendRow(cols.map(k => d[k] || ""));
  return ContentService.createTextOutput("ok");
}
```

## 채널별 링크
| 채널 | URL |
|---|---|
| 부스 QR | `https://jeklinkimm.github.io/gemgem/?utm_source=expo&utm_content=booth` |
| 부모 카드 QR | `https://jeklinkimm.github.io/gemgem/?utm_source=expo&utm_content=parent_card` |
| 인스타 프로필 | `https://jeklinkimm.github.io/gemgem/?utm_source=instagram&utm_content=bio` |
| 인스타 DM | `https://jeklinkimm.github.io/gemgem/?utm_source=instagram&utm_content=dm` |
| 단톡방 | `https://jeklinkimm.github.io/gemgem/?utm_source=referral&utm_content=kakao` |

토큰/웹훅 수정 후: `git commit -am "config" && git push` (반영까지 ~1분)
