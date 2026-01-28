# SADDAH CRM - Comprehensive Test Cases

## Test Environment
- **URL:** http://localhost:5173
- **Test Credentials:**
  - Admin: admin@saddah.io / Admin@123
  - Sales Rep: ahmad@saddah.io / Sales@123

---

## 1. Authentication Module

### TC-AUTH-001: Login with Valid Credentials
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User is on login page |
| **Steps** | 1. Enter valid email<br>2. Enter valid password<br>3. Click "دخول" button |
| **Expected Result** | User is redirected to dashboard with success toast |

### TC-AUTH-002: Login with Invalid Credentials
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User is on login page |
| **Steps** | 1. Enter invalid email/password<br>2. Click "دخول" button |
| **Expected Result** | Error toast appears with message "البريد الإلكتروني أو كلمة المرور غير صحيحة" |

### TC-AUTH-003: Login Form Validation
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | User is on login page |
| **Steps** | 1. Leave email empty<br>2. Enter password less than 8 characters<br>3. Click "دخول" |
| **Expected Result** | Validation errors shown for both fields |

### TC-AUTH-004: Password Visibility Toggle
| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | User is on login page |
| **Steps** | 1. Enter password<br>2. Click eye icon |
| **Expected Result** | Password becomes visible/hidden |

### TC-AUTH-005: Logout Functionality
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User is logged in |
| **Steps** | 1. Click user menu<br>2. Click "تسجيل الخروج" |
| **Expected Result** | User is logged out and redirected to login page |

---

## 2. Dashboard Module

### TC-DASH-001: Dashboard Load
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User is logged in |
| **Steps** | 1. Navigate to /dashboard |
| **Expected Result** | Dashboard loads with statistics cards, charts, and recent activities |

### TC-DASH-002: Statistics Cards Display
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | User is on dashboard |
| **Steps** | 1. Observe statistics cards |
| **Expected Result** | All cards show correct data (total contacts, deals, leads, revenue) |

### TC-DASH-003: Quick Actions
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | User is on dashboard |
| **Steps** | 1. Click quick action buttons |
| **Expected Result** | Each button navigates to correct page or opens modal |

---

## 3. Leads Module

### TC-LEAD-001: Leads List Load
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User is logged in |
| **Steps** | 1. Navigate to /leads |
| **Expected Result** | Leads table loads with data, statistics cards show loading skeleton then data |

### TC-LEAD-002: Statistics Loading State (Fixed Issue)
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | User navigates to leads page |
| **Steps** | 1. Observe statistics section during load |
| **Expected Result** | Animated skeleton placeholders shown while loading, then replaced with actual data |

### TC-LEAD-003: Create New Lead
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User is on leads page |
| **Steps** | 1. Click "إضافة عميل محتمل"<br>2. Fill required fields (firstName)<br>3. Fill optional fields<br>4. Click submit |
| **Expected Result** | Lead created, modal closes, success toast shown, table refreshed |

### TC-LEAD-004: Lead Form Validation
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Create lead modal is open |
| **Steps** | 1. Leave firstName empty<br>2. Click submit |
| **Expected Result** | Validation error "الاسم الأول مطلوب" shown |

### TC-LEAD-005: Filter Leads by Status
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | User is on leads page |
| **Steps** | 1. Select status filter "مؤهل"<br>2. Observe table |
| **Expected Result** | Only leads with status "مؤهل" are shown |

### TC-LEAD-006: Filter Leads by Source
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | User is on leads page |
| **Steps** | 1. Select source filter "واتساب بوت" |
| **Expected Result** | Only leads from WhatsApp bot source shown |

### TC-LEAD-007: Filter Leads by Property Type
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | User is on leads page |
| **Steps** | 1. Select property type "فيلا" |
| **Expected Result** | Only leads interested in villas shown |

### TC-LEAD-008: Lead Detail View
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Leads exist in table |
| **Steps** | 1. Click on a lead row |
| **Expected Result** | Lead detail modal opens with all information |

### TC-LEAD-009: Update Lead Status
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Lead detail modal is open |
| **Steps** | 1. Click status dropdown<br>2. Select new status |
| **Expected Result** | Status updated, success toast shown |

### TC-LEAD-010: Convert Lead to Deal
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Lead detail modal open, lead is qualified |
| **Steps** | 1. Click "تحويل إلى صفقة" |
| **Expected Result** | Deal creation modal opens with pre-filled data |

### TC-LEAD-011: Delete Lead
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Lead detail modal is open |
| **Steps** | 1. Click delete button<br>2. Confirm deletion |
| **Expected Result** | Lead deleted, modal closes, success toast, table refreshed |

### TC-LEAD-012: Lead Scoring Display
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Leads have scores |
| **Steps** | 1. Observe score column in table |
| **Expected Result** | Score bar with percentage and grade badge displayed correctly |

### TC-LEAD-013: Table Pagination
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | More than 20 leads exist |
| **Steps** | 1. Click next page button |
| **Expected Result** | Next page of leads loaded |

### TC-LEAD-014: Table Sorting
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | User is on leads page |
| **Steps** | 1. Click sortable column header |
| **Expected Result** | Table sorted by that column |

---

## 4. Contacts Module

### TC-CONT-001: Contacts List Load
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User is logged in |
| **Steps** | 1. Navigate to /contacts |
| **Expected Result** | Contacts table loads with data |

### TC-CONT-002: Create New Contact
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User is on contacts page |
| **Steps** | 1. Click "إضافة جهة اتصال"<br>2. Fill firstName, lastName<br>3. Fill phone OR email<br>4. Submit |
| **Expected Result** | Contact created, success toast shown |

### TC-CONT-003: Contact Validation - Required Fields
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Create contact modal open |
| **Steps** | 1. Leave firstName empty<br>2. Leave lastName empty<br>3. Submit |
| **Expected Result** | Validation errors for both fields |

### TC-CONT-004: Contact Validation - Phone or Email Required
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Create contact modal open |
| **Steps** | 1. Fill names<br>2. Leave both phone and email empty<br>3. Submit |
| **Expected Result** | Validation error "يجب إدخال رقم الهاتف أو البريد الإلكتروني" |

### TC-CONT-005: Contact Validation - Email Format
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Create contact modal open |
| **Steps** | 1. Enter invalid email format<br>2. Submit |
| **Expected Result** | Validation error "البريد الإلكتروني غير صالح" |

### TC-CONT-006: Edit Contact
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Contact exists |
| **Steps** | 1. Navigate to contact detail<br>2. Click edit<br>3. Modify fields<br>4. Save |
| **Expected Result** | Contact updated, success toast shown |

### TC-CONT-007: Edit Contact - Form Reset on Reopen (Fixed Issue)
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Edit contact modal was used |
| **Steps** | 1. Open edit modal for contact A<br>2. Close modal<br>3. Open edit modal for contact B |
| **Expected Result** | Form shows contact B's data, not contact A's |

### TC-CONT-008: Delete Contact
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Contact exists |
| **Steps** | 1. Navigate to contact detail<br>2. Click delete<br>3. Confirm |
| **Expected Result** | Contact deleted, redirected to list |

### TC-CONT-009: Contact Detail Page
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Contact exists |
| **Steps** | 1. Click on contact row |
| **Expected Result** | Detail page shows all contact info, activities, and deals |

### TC-CONT-010: Bulk Delete Contacts
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Multiple contacts exist |
| **Steps** | 1. Select multiple contacts<br>2. Click bulk delete<br>3. Confirm |
| **Expected Result** | Selected contacts deleted |

---

## 5. Companies Module

### TC-COMP-001: Companies List Load
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User is logged in |
| **Steps** | 1. Navigate to /companies |
| **Expected Result** | Companies displayed as cards with info |

### TC-COMP-002: Companies Error Toast (Fixed Issue)
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | API returns error |
| **Steps** | 1. Simulate API failure |
| **Expected Result** | Error toast "فشل في تحميل الشركات" shown |

### TC-COMP-003: Create New Company
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User is on companies page |
| **Steps** | 1. Click "إضافة شركة"<br>2. Fill name (required)<br>3. Fill optional fields<br>4. Submit |
| **Expected Result** | Company created, success toast shown |

### TC-COMP-004: Company Website URL Auto-Prepend (Fixed Issue)
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Create/Edit company modal open |
| **Steps** | 1. Enter "example.com" in website field<br>2. Submit |
| **Expected Result** | Website saved as "https://example.com" without validation error |

### TC-COMP-005: Edit Company
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Company exists |
| **Steps** | 1. Navigate to company detail<br>2. Click edit<br>3. Modify fields<br>4. Save |
| **Expected Result** | Company updated, success toast shown |

### TC-COMP-006: Edit Company - Form Reset (Fixed Issue)
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Edit company modal was used |
| **Steps** | 1. Open edit for company A<br>2. Close<br>3. Open edit for company B |
| **Expected Result** | Form shows company B's data correctly |

### TC-COMP-007: Company Detail Page
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Company exists |
| **Steps** | 1. Click on company card |
| **Expected Result** | Detail page shows company info, contacts, deals tabs |

### TC-COMP-008: Delete Company
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Company detail page open |
| **Steps** | 1. Click delete<br>2. Confirm |
| **Expected Result** | Company deleted, redirected to list |

### TC-COMP-009: Company Search
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Companies exist |
| **Steps** | 1. Enter search term |
| **Expected Result** | Companies filtered by name |

---

## 6. Deals Module (Kanban)

### TC-DEAL-001: Deals Kanban Load
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User is logged in |
| **Steps** | 1. Navigate to /deals |
| **Expected Result** | Kanban board loads with pipeline stages as columns |

### TC-DEAL-002: Create New Deal
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User is on deals page |
| **Steps** | 1. Click "إضافة صفقة"<br>2. Fill title, value<br>3. Select pipeline and stage<br>4. Submit |
| **Expected Result** | Deal created, appears in correct stage column |

### TC-DEAL-003: Deal Validation
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Create deal modal open |
| **Steps** | 1. Leave title empty<br>2. Enter 0 for value<br>3. Submit |
| **Expected Result** | Validation errors shown |

### TC-DEAL-004: Drag and Drop Deal
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Deals exist in kanban |
| **Steps** | 1. Drag deal card to different stage column |
| **Expected Result** | Deal moves to new stage, API updated |

### TC-DEAL-005: Deal Detail Modal
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Deals exist |
| **Steps** | 1. Click on deal card |
| **Expected Result** | Detail modal opens with all deal information |

### TC-DEAL-006: Close Deal - Won
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Deal detail modal open |
| **Steps** | 1. Click "تم الفوز" |
| **Expected Result** | Deal status changed to won, success toast |

### TC-DEAL-007: Close Deal - Lost
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | Deal detail modal open |
| **Steps** | 1. Click "خسارة" |
| **Expected Result** | Deal status changed to lost |

### TC-DEAL-008: Reopen Closed Deal
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Closed deal detail modal open |
| **Steps** | 1. Click "إعادة فتح" |
| **Expected Result** | Deal status changed back to open |

### TC-DEAL-009: Delete Deal
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Deal detail modal open |
| **Steps** | 1. Click delete<br>2. Confirm |
| **Expected Result** | Deal deleted from kanban |

### TC-DEAL-010: Switch Pipeline
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Multiple pipelines exist |
| **Steps** | 1. Select different pipeline from dropdown |
| **Expected Result** | Kanban shows stages for selected pipeline |

---

## 7. Activities Module

### TC-ACT-001: Activities List Load
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User is logged in |
| **Steps** | 1. Navigate to /activities |
| **Expected Result** | Activities table loads with data |

### TC-ACT-002: Activity Type Icons (Fixed Issue)
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Activities with various types exist |
| **Steps** | 1. Observe type column |
| **Expected Result** | Each type has correct background color (not broken dynamic classes) |

### TC-ACT-003: Create New Activity
| Field | Value |
|-------|-------|
| **Priority** | Critical |
| **Precondition** | User is on activities page |
| **Steps** | 1. Click "إضافة نشاط"<br>2. Select type<br>3. Fill title, date<br>4. Submit |
| **Expected Result** | Activity created, success toast |

### TC-ACT-004: Filter by Activity Type
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Various activities exist |
| **Steps** | 1. Select type filter "اجتماع" |
| **Expected Result** | Only meeting activities shown |

### TC-ACT-005: Filter by Completion Status
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Completed and incomplete activities exist |
| **Steps** | 1. Select "مكتمل" filter |
| **Expected Result** | Only completed activities shown |

### TC-ACT-006: Complete Activity
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Incomplete activity exists |
| **Steps** | 1. Click complete button on activity |
| **Expected Result** | Activity marked complete, visual update |

### TC-ACT-007: Activity Detail Modal
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Activities exist |
| **Steps** | 1. Click on activity row |
| **Expected Result** | Detail modal opens with full information |

### TC-ACT-008: Delete Activity
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Activity detail modal open |
| **Steps** | 1. Click delete<br>2. Confirm |
| **Expected Result** | Activity deleted |

---

## 8. Pipelines Module

### TC-PIPE-001: Pipelines Page Load
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | User is logged in |
| **Steps** | 1. Navigate to /pipelines |
| **Expected Result** | Pipelines list loads with stages |

### TC-PIPE-002: Add New Stage
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Pipeline selected |
| **Steps** | 1. Click "إضافة مرحلة جديدة"<br>2. Enter name<br>3. Select color<br>4. Confirm |
| **Expected Result** | New stage added to pipeline |

### TC-PIPE-003: Edit Stage
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Stage exists |
| **Steps** | 1. Click edit on stage<br>2. Modify name/color<br>3. Save |
| **Expected Result** | Stage updated |

### TC-PIPE-004: Delete Stage
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Stage exists with no deals |
| **Steps** | 1. Click delete on stage<br>2. Confirm |
| **Expected Result** | Stage removed |

### TC-PIPE-005: Reorder Stages (Drag & Drop)
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Multiple stages exist |
| **Steps** | 1. Drag stage to new position |
| **Expected Result** | Stage order updated |

---

## 9. Conversations Module

### TC-CONV-001: Conversations Load
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | User is logged in |
| **Steps** | 1. Navigate to /conversations |
| **Expected Result** | Conversations list loads on left, chat area on right |

### TC-CONV-002: Search Conversations
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Conversations exist |
| **Steps** | 1. Enter search term in search box |
| **Expected Result** | Conversations filtered by contact name |

### TC-CONV-003: Select Conversation
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Conversations exist |
| **Steps** | 1. Click on conversation item |
| **Expected Result** | Chat messages load in right panel |

### TC-CONV-004: View Contact Info
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Conversation selected |
| **Steps** | 1. Click contact info button |
| **Expected Result** | Contact details panel opens |

---

## 10. Reports Module

### TC-REP-001: Reports Page Load
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | User is logged in |
| **Steps** | 1. Navigate to /reports |
| **Expected Result** | Reports page loads with charts and statistics |

### TC-REP-002: Revenue Chart Display
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Deal data exists |
| **Steps** | 1. Observe revenue chart |
| **Expected Result** | Line chart shows revenue trend |

### TC-REP-003: Lead Sources Pie Chart
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Lead data exists |
| **Steps** | 1. Observe lead sources chart |
| **Expected Result** | Pie chart shows distribution by source |

### TC-REP-004: Deals by Stage Bar Chart
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Deal data exists |
| **Steps** | 1. Observe deals by stage chart |
| **Expected Result** | Horizontal bar chart with stage colors |

---

## 11. Settings Module

### TC-SET-001: Settings Page Load
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | User is logged in |
| **Steps** | 1. Navigate to /settings |
| **Expected Result** | Settings page loads with profile, notifications, language tabs |

### TC-SET-002: Update Profile
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | On settings page |
| **Steps** | 1. Modify profile fields<br>2. Save |
| **Expected Result** | Profile updated, success toast |

### TC-SET-003: Change Password
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | On settings page |
| **Steps** | 1. Enter current password<br>2. Enter new password<br>3. Confirm new password<br>4. Save |
| **Expected Result** | Password changed, success toast |

---

## 12. Global Search

### TC-SEARCH-001: Global Search Functionality
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | User is logged in |
| **Steps** | 1. Type in global search (min 2 chars) |
| **Expected Result** | Dropdown shows results from contacts, companies, deals, leads |

### TC-SEARCH-002: Search Result Navigation
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Search results showing |
| **Steps** | 1. Click on a search result |
| **Expected Result** | Navigates to correct detail page |

### TC-SEARCH-003: Clear Search
| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | Search has text |
| **Steps** | 1. Click X button |
| **Expected Result** | Search cleared, dropdown closes |

---

## 13. Notifications

### TC-NOTIF-001: Notifications Dropdown
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | User is logged in |
| **Steps** | 1. Click bell icon in header |
| **Expected Result** | Notifications dropdown opens |

### TC-NOTIF-002: Mark Notification as Read
| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | Unread notification exists |
| **Steps** | 1. Click check icon on notification |
| **Expected Result** | Notification marked as read, count decreases |

### TC-NOTIF-003: Mark All as Read
| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | Multiple unread notifications |
| **Steps** | 1. Click "تحديد الكل كمقروء" |
| **Expected Result** | All notifications marked read |

### TC-NOTIF-004: Delete Notification
| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | Notification exists |
| **Steps** | 1. Click X on notification |
| **Expected Result** | Notification removed |

---

## 14. Language & Localization

### TC-LANG-001: Switch to English
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | App is in Arabic |
| **Steps** | 1. Click globe icon<br>2. Select English |
| **Expected Result** | UI switches to English, RTL to LTR |

### TC-LANG-002: Switch to Arabic
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | App is in English |
| **Steps** | 1. Click globe icon<br>2. Select Arabic |
| **Expected Result** | UI switches to Arabic, LTR to RTL |

### TC-LANG-003: Profile Text Translation (Fixed Issue)
| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | User menu open |
| **Steps** | 1. Observe profile link text |
| **Expected Result** | Shows "الملف الشخصي" in Arabic, "Profile" in English |

---

## 15. Accessibility

### TC-A11Y-001: Button Aria Labels
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Any page loaded |
| **Steps** | 1. Inspect icon-only buttons |
| **Expected Result** | All icon buttons have aria-label attributes |

### TC-A11Y-002: Search Input Accessibility
| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | Search input visible |
| **Steps** | 1. Inspect search input |
| **Expected Result** | Has aria-label and role="searchbox" |

### TC-A11Y-003: Modal Close Button
| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | Any modal open |
| **Steps** | 1. Inspect close button |
| **Expected Result** | Has aria-label="إغلاق" |

### TC-A11Y-004: Notification Badge
| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | Unread notifications exist |
| **Steps** | 1. Inspect notification button |
| **Expected Result** | aria-label includes unread count |

---

## 16. Responsive Design

### TC-RESP-001: Mobile Menu
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Screen width < 1024px |
| **Steps** | 1. Click hamburger menu |
| **Expected Result** | Sidebar opens as overlay |

### TC-RESP-002: Sidebar Collapse
| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | Desktop view |
| **Steps** | 1. Click collapse button |
| **Expected Result** | Sidebar collapses to icons only |

### TC-RESP-003: Table Responsiveness
| Field | Value |
|-------|-------|
| **Priority** | Medium |
| **Precondition** | Mobile view on table page |
| **Steps** | 1. Scroll horizontally |
| **Expected Result** | Table scrolls horizontally |

---

## 17. Error Handling

### TC-ERR-001: API Error Toast
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | API call fails |
| **Steps** | 1. Trigger API failure |
| **Expected Result** | Error toast shown with Arabic message |

### TC-ERR-002: Form Error Display
| Field | Value |
|-------|-------|
| **Priority** | High |
| **Precondition** | Any form |
| **Steps** | 1. Submit with validation errors |
| **Expected Result** | Errors shown below each invalid field |

### TC-ERR-003: 404 Page
| Field | Value |
|-------|-------|
| **Priority** | Low |
| **Precondition** | Navigate to invalid route |
| **Steps** | 1. Go to /invalid-page |
| **Expected Result** | 404 page or redirect to dashboard |

---

## Summary

| Module | Test Cases | Priority Breakdown |
|--------|------------|-------------------|
| Authentication | 5 | Critical: 3, High: 1, Low: 1 |
| Dashboard | 3 | Critical: 1, High: 1, Medium: 1 |
| Leads | 14 | Critical: 2, High: 6, Medium: 6 |
| Contacts | 10 | Critical: 2, High: 5, Medium: 3 |
| Companies | 9 | Critical: 2, High: 3, Medium: 4 |
| Deals | 10 | Critical: 3, High: 4, Medium: 3 |
| Activities | 8 | Critical: 1, High: 2, Medium: 5 |
| Pipelines | 5 | High: 2, Medium: 3 |
| Conversations | 4 | High: 2, Medium: 2 |
| Reports | 4 | High: 1, Medium: 3 |
| Settings | 3 | High: 1, Medium: 2 |
| Global Search | 3 | High: 1, Medium: 1, Low: 1 |
| Notifications | 4 | Medium: 1, Low: 3 |
| Language | 3 | Medium: 2, Low: 1 |
| Accessibility | 4 | Medium: 1, Low: 3 |
| Responsive | 3 | Medium: 2, Low: 1 |
| Error Handling | 3 | High: 2, Low: 1 |

**Total: 95 Test Cases**
- Critical: 14
- High: 30
- Medium: 34
- Low: 17
