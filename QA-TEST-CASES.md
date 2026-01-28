# SADDAH CRM - Manual QA Test Cases

**Tester Name:** ____________________
**Test Date:** ____________________
**Environment:** ____________________
**Browser:** ____________________

---

## Test Summary

| Module | Total Tests | Passed | Failed | Blocked |
|--------|-------------|--------|--------|---------|
| Authentication | 8 | | | |
| Dashboard | 6 | | | |
| Leads | 14 | | | |
| Contacts | 12 | | | |
| Companies | 10 | | | |
| Deals & Pipeline | 16 | | | |
| Activities | 10 | | | |
| Reports | 8 | | | |
| Settings | 12 | | | |
| Navigation & UI | 8 | | | |
| **TOTAL** | **104** | | | |

---

## 1. AUTHENTICATION MODULE

### TC-AUTH-001: Valid Login
| Field | Value |
|-------|-------|
| **Preconditions** | User account exists, application is running |
| **Test Data** | Email: admin@saddah.com, Password: Admin123! |
| **Steps** | 1. Navigate to login page<br>2. Enter valid email<br>3. Enter valid password<br>4. Click "تسجيل الدخول" (Login) button |
| **Expected Result** | User is redirected to Dashboard, user name appears in header |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-AUTH-002: Invalid Email Login
| Field | Value |
|-------|-------|
| **Preconditions** | Application is running |
| **Test Data** | Email: invalid@test.com, Password: Admin123! |
| **Steps** | 1. Navigate to login page<br>2. Enter invalid email<br>3. Enter any password<br>4. Click Login button |
| **Expected Result** | Error message displayed: "البريد الإلكتروني أو كلمة المرور غير صحيحة" |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-AUTH-003: Invalid Password Login
| Field | Value |
|-------|-------|
| **Preconditions** | User account exists |
| **Test Data** | Email: admin@saddah.com, Password: wrongpassword |
| **Steps** | 1. Navigate to login page<br>2. Enter valid email<br>3. Enter wrong password<br>4. Click Login button |
| **Expected Result** | Error message displayed: "البريد الإلكتروني أو كلمة المرور غير صحيحة" |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-AUTH-004: Empty Fields Login
| Field | Value |
|-------|-------|
| **Preconditions** | Application is running |
| **Test Data** | None |
| **Steps** | 1. Navigate to login page<br>2. Leave email empty<br>3. Leave password empty<br>4. Click Login button |
| **Expected Result** | Validation errors shown for required fields |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-AUTH-005: Email Format Validation
| Field | Value |
|-------|-------|
| **Preconditions** | Application is running |
| **Test Data** | Email: notanemail, Password: test123 |
| **Steps** | 1. Navigate to login page<br>2. Enter invalid email format<br>3. Enter password<br>4. Click Login button |
| **Expected Result** | Email validation error shown |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-AUTH-006: Logout
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | None |
| **Steps** | 1. Click user menu in header<br>2. Click "تسجيل الخروج" (Logout) |
| **Expected Result** | User is redirected to login page, session is cleared |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-AUTH-007: Session Persistence
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | None |
| **Steps** | 1. Login successfully<br>2. Close browser tab<br>3. Open new tab and navigate to app |
| **Expected Result** | User remains logged in (within session timeout) |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-AUTH-008: Protected Routes
| Field | Value |
|-------|-------|
| **Preconditions** | User is NOT logged in |
| **Test Data** | None |
| **Steps** | 1. Clear browser storage<br>2. Navigate directly to /dashboard<br>3. Try navigating to /contacts, /deals, etc. |
| **Expected Result** | User is redirected to login page for all protected routes |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

---

## 2. DASHBOARD MODULE

### TC-DASH-001: Dashboard Load
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | None |
| **Steps** | 1. Navigate to Dashboard (click logo or "لوحة التحكم") |
| **Expected Result** | Dashboard loads with stats cards, charts, and recent activities |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DASH-002: Stats Cards Display
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, data exists in system |
| **Test Data** | None |
| **Steps** | 1. View dashboard<br>2. Check all 4 stat cards |
| **Expected Result** | Cards show: Total Leads, Active Deals, Contacts, Revenue with correct numbers |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DASH-003: Recent Activities Widget
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, activities exist |
| **Test Data** | None |
| **Steps** | 1. View dashboard<br>2. Scroll to recent activities section |
| **Expected Result** | Recent activities displayed with type icons, descriptions, and timestamps |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DASH-004: Upcoming Tasks Widget
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, tasks with due dates exist |
| **Test Data** | None |
| **Steps** | 1. View dashboard<br>2. Check upcoming tasks section |
| **Expected Result** | Tasks due today/soon are displayed with due dates |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DASH-005: Pipeline Overview Chart
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, deals exist in pipeline |
| **Test Data** | None |
| **Steps** | 1. View dashboard<br>2. Check pipeline chart/funnel |
| **Expected Result** | Pipeline stages shown with deal counts and values |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DASH-006: Dashboard Refresh
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | None |
| **Steps** | 1. View dashboard<br>2. Create a new lead in another tab<br>3. Refresh dashboard |
| **Expected Result** | Stats update to reflect new data |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

---

## 3. LEADS MODULE

### TC-LEAD-001: View Leads List
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | None |
| **Steps** | 1. Click "العملاء المحتملين" (Leads) in sidebar |
| **Expected Result** | Leads list page loads with table showing all leads |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-LEAD-002: Create New Lead - All Fields
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, on Leads page |
| **Test Data** | First Name: أحمد, Last Name: محمد, Email: ahmed@test.com, Phone: 0501234567, WhatsApp: 0501234567, Source: website, Property Type: apartment, Budget: 500000, Timeline: 3_months |
| **Steps** | 1. Click "إضافة عميل محتمل" button<br>2. Fill all fields<br>3. Click Save |
| **Expected Result** | Lead created successfully, appears in list, success toast shown |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-LEAD-003: Create Lead - Required Fields Only
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, on Leads page |
| **Test Data** | First Name: سارة |
| **Steps** | 1. Click "إضافة عميل محتمل"<br>2. Enter only first name<br>3. Click Save |
| **Expected Result** | Lead created with minimal data |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-LEAD-004: Create Lead - Validation
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, on Leads page |
| **Test Data** | Email: invalid-email |
| **Steps** | 1. Click "إضافة عميل محتمل"<br>2. Enter invalid email format<br>3. Click Save |
| **Expected Result** | Validation error shown for email field |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-LEAD-005: View Lead Details
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, leads exist |
| **Test Data** | None |
| **Steps** | 1. Click on a lead row in the list |
| **Expected Result** | Lead detail modal opens showing all lead information |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-LEAD-006: Edit Lead
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, lead exists |
| **Test Data** | Updated Phone: 0559876543 |
| **Steps** | 1. Open lead detail modal<br>2. Click Edit button<br>3. Change phone number<br>4. Save changes |
| **Expected Result** | Lead updated successfully, changes reflected in list |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-LEAD-007: Update Lead Status
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, lead with status "new" exists |
| **Test Data** | New Status: contacted |
| **Steps** | 1. Open lead detail<br>2. Change status dropdown to "تم التواصل"<br>3. Confirm change |
| **Expected Result** | Status updated, badge color changes accordingly |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-LEAD-008: Search Leads
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, multiple leads exist |
| **Test Data** | Search: أحمد |
| **Steps** | 1. Enter "أحمد" in search box<br>2. Press Enter or wait for auto-search |
| **Expected Result** | List filters to show only leads matching "أحمد" |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-LEAD-009: Filter Leads by Status
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, leads with different statuses exist |
| **Test Data** | Filter: qualified |
| **Steps** | 1. Click status filter dropdown<br>2. Select "مؤهل" |
| **Expected Result** | List shows only qualified leads |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-LEAD-010: Filter Leads by Source
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, leads from different sources exist |
| **Test Data** | Filter: website |
| **Steps** | 1. Click source filter dropdown<br>2. Select "الموقع الإلكتروني" |
| **Expected Result** | List shows only leads from website source |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-LEAD-011: Convert Lead to Contact
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, qualified lead exists, pipeline exists |
| **Test Data** | Pipeline: Default Sales Pipeline |
| **Steps** | 1. Open qualified lead detail<br>2. Click "تحويل" (Convert) button<br>3. Select pipeline<br>4. Confirm conversion |
| **Expected Result** | Lead status changes to "converted", new contact created, optionally new deal created |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-LEAD-012: Delete Lead
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, lead exists |
| **Test Data** | None |
| **Steps** | 1. Open lead detail<br>2. Click Delete button<br>3. Confirm deletion |
| **Expected Result** | Lead removed from list, success message shown |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-LEAD-013: Lead Score Display
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, lead with score exists |
| **Test Data** | None |
| **Steps** | 1. View leads list<br>2. Check score column |
| **Expected Result** | Score displayed with appropriate color (green for high, yellow for medium, red for low) |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-LEAD-014: Pagination
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, more than 20 leads exist |
| **Test Data** | None |
| **Steps** | 1. View leads list<br>2. Scroll to bottom<br>3. Click page 2 or "Next" |
| **Expected Result** | Second page of leads loads |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

---

## 4. CONTACTS MODULE

### TC-CONT-001: View Contacts List
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | None |
| **Steps** | 1. Click "جهات الاتصال" (Contacts) in sidebar |
| **Expected Result** | Contacts list page loads with table |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-CONT-002: Create New Contact
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, on Contacts page |
| **Test Data** | First Name: خالد, Last Name: العتيبي, Email: khaled@company.com, Phone: 0551234567, Title: مدير المبيعات |
| **Steps** | 1. Click "إضافة جهة اتصال"<br>2. Fill all fields<br>3. Click Save |
| **Expected Result** | Contact created, appears in list |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-CONT-003: Create Contact with Company
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, company exists |
| **Test Data** | First Name: نورة, Company: (select existing) |
| **Steps** | 1. Click "إضافة جهة اتصال"<br>2. Fill name<br>3. Select company from dropdown<br>4. Save |
| **Expected Result** | Contact created and linked to company |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-CONT-004: View Contact Details
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, contact exists |
| **Test Data** | None |
| **Steps** | 1. Click on contact row |
| **Expected Result** | Contact detail page loads with all info, related deals, activities |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-CONT-005: Edit Contact
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, contact exists |
| **Test Data** | Updated Title: مدير تنفيذي |
| **Steps** | 1. Open contact detail<br>2. Click Edit<br>3. Update title<br>4. Save |
| **Expected Result** | Contact updated successfully |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-CONT-006: Search Contacts
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, contacts exist |
| **Test Data** | Search: خالد |
| **Steps** | 1. Enter search term<br>2. View results |
| **Expected Result** | List filters to matching contacts |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-CONT-007: Filter by Company
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, contacts with companies exist |
| **Test Data** | Company filter: (select one) |
| **Steps** | 1. Select company from filter<br>2. View results |
| **Expected Result** | Only contacts from selected company shown |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-CONT-008: Add Tags to Contact
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, contact exists |
| **Test Data** | Tags: VIP, مستثمر |
| **Steps** | 1. Edit contact<br>2. Add tags<br>3. Save |
| **Expected Result** | Tags saved and displayed on contact |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-CONT-009: Delete Contact
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, contact without deals exists |
| **Test Data** | None |
| **Steps** | 1. Open contact<br>2. Click Delete<br>3. Confirm |
| **Expected Result** | Contact removed (soft delete) |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-CONT-010: View Contact's Deals
| Field | Value |
|-------|-------|
| **Preconditions** | Contact with deals exists |
| **Test Data** | None |
| **Steps** | 1. Open contact detail<br>2. View deals section |
| **Expected Result** | All deals linked to contact are displayed |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-CONT-011: View Contact's Activities
| Field | Value |
|-------|-------|
| **Preconditions** | Contact with activities exists |
| **Test Data** | None |
| **Steps** | 1. Open contact detail<br>2. View activities section |
| **Expected Result** | Activity timeline shown |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-CONT-012: Bulk Operations - Assign Owner
| Field | Value |
|-------|-------|
| **Preconditions** | Multiple contacts exist, multiple users exist |
| **Test Data** | Select 3 contacts, assign to specific user |
| **Steps** | 1. Select multiple contacts via checkboxes<br>2. Click bulk actions<br>3. Select "Assign to"<br>4. Choose user |
| **Expected Result** | All selected contacts assigned to new owner |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

---

## 5. COMPANIES MODULE

### TC-COMP-001: View Companies List
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | None |
| **Steps** | 1. Click "الشركات" (Companies) in sidebar |
| **Expected Result** | Companies list loads |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-COMP-002: Create New Company
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | Name: شركة الرياض للتطوير, Industry: عقارات, City: الرياض, Phone: 0112345678, Website: www.riyadhdev.com |
| **Steps** | 1. Click "إضافة شركة"<br>2. Fill all fields<br>3. Save |
| **Expected Result** | Company created successfully |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-COMP-003: Create Company - Required Fields Only
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | Name: شركة جديدة |
| **Steps** | 1. Click "إضافة شركة"<br>2. Enter only name<br>3. Save |
| **Expected Result** | Company created with minimal data |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-COMP-004: View Company Details
| Field | Value |
|-------|-------|
| **Preconditions** | Company exists |
| **Test Data** | None |
| **Steps** | 1. Click on company row |
| **Expected Result** | Company detail page with contacts and deals |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-COMP-005: Edit Company
| Field | Value |
|-------|-------|
| **Preconditions** | Company exists |
| **Test Data** | Updated Industry: تقنية |
| **Steps** | 1. Open company detail<br>2. Click Edit<br>3. Change industry<br>4. Save |
| **Expected Result** | Company updated |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-COMP-006: Search Companies
| Field | Value |
|-------|-------|
| **Preconditions** | Companies exist |
| **Test Data** | Search: الرياض |
| **Steps** | 1. Enter search term<br>2. View results |
| **Expected Result** | Matching companies shown |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-COMP-007: Filter by Industry
| Field | Value |
|-------|-------|
| **Preconditions** | Companies with different industries exist |
| **Test Data** | Filter: عقارات |
| **Steps** | 1. Select industry filter<br>2. View results |
| **Expected Result** | Only real estate companies shown |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-COMP-008: Filter by City
| Field | Value |
|-------|-------|
| **Preconditions** | Companies in different cities exist |
| **Test Data** | Filter: جدة |
| **Steps** | 1. Select city filter<br>2. View results |
| **Expected Result** | Only Jeddah companies shown |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-COMP-009: View Company Contacts
| Field | Value |
|-------|-------|
| **Preconditions** | Company with contacts exists |
| **Test Data** | None |
| **Steps** | 1. Open company detail<br>2. View contacts section |
| **Expected Result** | All contacts linked to company displayed |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-COMP-010: Delete Company
| Field | Value |
|-------|-------|
| **Preconditions** | Company without linked records exists |
| **Test Data** | None |
| **Steps** | 1. Open company<br>2. Click Delete<br>3. Confirm |
| **Expected Result** | Company soft deleted |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

---

## 6. DEALS & PIPELINE MODULE

### TC-DEAL-001: View Kanban Board
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, pipeline exists |
| **Test Data** | None |
| **Steps** | 1. Click "الصفقات" (Deals) in sidebar |
| **Expected Result** | Kanban board loads with pipeline stages as columns |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DEAL-002: Create New Deal
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, pipeline exists, contact exists |
| **Test Data** | Title: صفقة فيلا الرياض, Value: 2500000, Contact: (select), Pipeline: (select) |
| **Steps** | 1. Click "إضافة صفقة"<br>2. Fill all fields<br>3. Save |
| **Expected Result** | Deal created, appears in first stage of pipeline |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DEAL-003: Create Deal with Expected Close Date
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | Title: صفقة جديدة, Expected Close: (30 days from now) |
| **Steps** | 1. Click "إضافة صفقة"<br>2. Fill title and close date<br>3. Save |
| **Expected Result** | Deal created with expected close date |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DEAL-004: View Deal Details
| Field | Value |
|-------|-------|
| **Preconditions** | Deal exists |
| **Test Data** | None |
| **Steps** | 1. Click on deal card in Kanban |
| **Expected Result** | Deal detail modal opens with all information |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DEAL-005: Edit Deal
| Field | Value |
|-------|-------|
| **Preconditions** | Deal exists |
| **Test Data** | Updated Value: 3000000 |
| **Steps** | 1. Open deal detail<br>2. Click Edit<br>3. Update value<br>4. Save |
| **Expected Result** | Deal value updated |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DEAL-006: Drag Deal to Next Stage
| Field | Value |
|-------|-------|
| **Preconditions** | Deal exists in first stage |
| **Test Data** | None |
| **Steps** | 1. View Kanban board<br>2. Drag deal card to next stage column<br>3. Drop |
| **Expected Result** | Deal moves to new stage, probability updates |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DEAL-007: Move Deal via Detail Modal
| Field | Value |
|-------|-------|
| **Preconditions** | Deal exists |
| **Test Data** | Target stage: المفاوضات |
| **Steps** | 1. Open deal detail<br>2. Select new stage from dropdown<br>3. Confirm |
| **Expected Result** | Deal moves to selected stage |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DEAL-008: Mark Deal as Won
| Field | Value |
|-------|-------|
| **Preconditions** | Open deal exists |
| **Test Data** | None |
| **Steps** | 1. Open deal detail<br>2. Click "ربح" (Won) button<br>3. Confirm |
| **Expected Result** | Deal status changes to "won", probability set to 100% |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DEAL-009: Mark Deal as Lost
| Field | Value |
|-------|-------|
| **Preconditions** | Open deal exists |
| **Test Data** | Lost Reason: السعر مرتفع |
| **Steps** | 1. Open deal detail<br>2. Click "خسارة" (Lost) button<br>3. Enter lost reason<br>4. Confirm |
| **Expected Result** | Deal status changes to "lost", reason saved |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DEAL-010: Reopen Closed Deal
| Field | Value |
|-------|-------|
| **Preconditions** | Won or lost deal exists |
| **Test Data** | None |
| **Steps** | 1. Open closed deal detail<br>2. Click "إعادة فتح" (Reopen)<br>3. Confirm |
| **Expected Result** | Deal status returns to "open" |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DEAL-011: Filter Deals by Pipeline
| Field | Value |
|-------|-------|
| **Preconditions** | Multiple pipelines with deals exist |
| **Test Data** | Select different pipeline |
| **Steps** | 1. Click pipeline selector<br>2. Choose different pipeline |
| **Expected Result** | Kanban shows deals from selected pipeline only |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DEAL-012: View Stage Totals
| Field | Value |
|-------|-------|
| **Preconditions** | Deals exist in stages |
| **Test Data** | None |
| **Steps** | 1. View Kanban board<br>2. Check stage headers |
| **Expected Result** | Each stage shows count and total value of deals |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DEAL-013: Delete Deal
| Field | Value |
|-------|-------|
| **Preconditions** | Deal exists |
| **Test Data** | None |
| **Steps** | 1. Open deal detail<br>2. Click Delete<br>3. Confirm |
| **Expected Result** | Deal removed from board |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DEAL-014: Create Pipeline (Settings)
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, in Settings |
| **Test Data** | Name: مسار العقارات السكنية |
| **Steps** | 1. Go to Settings > Pipelines<br>2. Click Add Pipeline<br>3. Enter name<br>4. Save |
| **Expected Result** | New pipeline created with default stages |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DEAL-015: Edit Pipeline Stages
| Field | Value |
|-------|-------|
| **Preconditions** | Pipeline exists |
| **Test Data** | New stage name: المعاينة |
| **Steps** | 1. Go to Settings > Pipelines<br>2. Click Edit on pipeline<br>3. Add/edit stage<br>4. Save |
| **Expected Result** | Pipeline stages updated |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-DEAL-016: Reorder Pipeline Stages
| Field | Value |
|-------|-------|
| **Preconditions** | Pipeline with multiple stages exists |
| **Test Data** | None |
| **Steps** | 1. Go to Settings > Pipelines<br>2. Drag stages to reorder<br>3. Save |
| **Expected Result** | Stage order updated, reflected in Kanban |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

---

## 7. ACTIVITIES MODULE

### TC-ACT-001: View Activities List
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | None |
| **Steps** | 1. Click "الأنشطة" (Activities) in sidebar |
| **Expected Result** | Activities list loads |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-ACT-002: Create Call Activity
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, contact exists |
| **Test Data** | Type: call, Subject: مكالمة متابعة, Contact: (select), Due: tomorrow |
| **Steps** | 1. Click "إضافة نشاط"<br>2. Select type "مكالمة"<br>3. Fill details<br>4. Save |
| **Expected Result** | Call activity created |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-ACT-003: Create Meeting Activity
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | Type: meeting, Subject: اجتماع عرض العقار, Duration: 60 min |
| **Steps** | 1. Click "إضافة نشاط"<br>2. Select "اجتماع"<br>3. Fill details<br>4. Save |
| **Expected Result** | Meeting activity created |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-ACT-004: Create Task Activity
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | Type: task, Subject: إعداد العرض, Due: end of week |
| **Steps** | 1. Click "إضافة نشاط"<br>2. Select "مهمة"<br>3. Fill details<br>4. Save |
| **Expected Result** | Task created |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-ACT-005: Link Activity to Deal
| Field | Value |
|-------|-------|
| **Preconditions** | Deal exists |
| **Test Data** | Activity linked to specific deal |
| **Steps** | 1. Create new activity<br>2. Select deal from dropdown<br>3. Save |
| **Expected Result** | Activity linked to deal, visible in deal detail |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-ACT-006: Complete Activity
| Field | Value |
|-------|-------|
| **Preconditions** | Pending activity exists |
| **Test Data** | Outcome: تم التواصل بنجاح |
| **Steps** | 1. Open activity detail<br>2. Click "إكمال"<br>3. Enter outcome<br>4. Save |
| **Expected Result** | Activity marked complete, outcome saved |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-ACT-007: Filter Activities by Type
| Field | Value |
|-------|-------|
| **Preconditions** | Activities of different types exist |
| **Test Data** | Filter: calls only |
| **Steps** | 1. Select "مكالمات" from type filter |
| **Expected Result** | Only call activities shown |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-ACT-008: Filter Activities by Status
| Field | Value |
|-------|-------|
| **Preconditions** | Completed and pending activities exist |
| **Test Data** | Filter: pending |
| **Steps** | 1. Select "قيد الانتظار" filter |
| **Expected Result** | Only pending activities shown |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-ACT-009: View Overdue Activities
| Field | Value |
|-------|-------|
| **Preconditions** | Overdue activity exists (due date in past) |
| **Test Data** | None |
| **Steps** | 1. View activities list<br>2. Check overdue indicator |
| **Expected Result** | Overdue activities highlighted in red |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-ACT-010: Delete Activity
| Field | Value |
|-------|-------|
| **Preconditions** | Activity exists |
| **Test Data** | None |
| **Steps** | 1. Open activity<br>2. Click Delete<br>3. Confirm |
| **Expected Result** | Activity removed |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

---

## 8. REPORTS MODULE

### TC-REP-001: View Reports Page
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | None |
| **Steps** | 1. Click "التقارير" (Reports) in sidebar |
| **Expected Result** | Reports page loads with charts and filters |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-REP-002: Sales Performance Report
| Field | Value |
|-------|-------|
| **Preconditions** | Deals data exists |
| **Test Data** | Date range: This month |
| **Steps** | 1. View reports page<br>2. Check sales performance section |
| **Expected Result** | Chart shows won/lost deals, revenue |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-REP-003: Pipeline Report
| Field | Value |
|-------|-------|
| **Preconditions** | Deals in pipeline exist |
| **Test Data** | None |
| **Steps** | 1. View pipeline report section |
| **Expected Result** | Funnel chart shows deals by stage |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-REP-004: Leads Report
| Field | Value |
|-------|-------|
| **Preconditions** | Leads data exists |
| **Test Data** | None |
| **Steps** | 1. View leads report section |
| **Expected Result** | Chart shows leads by source, status |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-REP-005: Filter Reports by Date Range
| Field | Value |
|-------|-------|
| **Preconditions** | Data exists |
| **Test Data** | Custom range: Last 7 days |
| **Steps** | 1. Select date range filter<br>2. Choose "آخر 7 أيام" |
| **Expected Result** | All charts update to show selected range |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-REP-006: Filter Reports by User
| Field | Value |
|-------|-------|
| **Preconditions** | Multiple users with data exist |
| **Test Data** | Select specific user |
| **Steps** | 1. Select user filter<br>2. Choose a user |
| **Expected Result** | Reports show only that user's data |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-REP-007: Filter Reports by Pipeline
| Field | Value |
|-------|-------|
| **Preconditions** | Multiple pipelines exist |
| **Test Data** | Select specific pipeline |
| **Steps** | 1. Select pipeline filter<br>2. Choose a pipeline |
| **Expected Result** | Pipeline report shows selected pipeline only |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-REP-008: Activity Report
| Field | Value |
|-------|-------|
| **Preconditions** | Activities data exists |
| **Test Data** | None |
| **Steps** | 1. View activity report section |
| **Expected Result** | Chart shows activities by type, completion rate |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

---

## 9. SETTINGS MODULE

### TC-SET-001: Access Settings Page
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | None |
| **Steps** | 1. Click "الإعدادات" (Settings) in sidebar |
| **Expected Result** | Settings page loads with tabs |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-SET-002: View Pipelines Tab
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | None |
| **Steps** | 1. Go to Settings<br>2. Click "خطوط المبيعات" tab |
| **Expected Result** | List of pipelines displayed |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-SET-003: View Team Tab
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in as admin |
| **Test Data** | None |
| **Steps** | 1. Go to Settings<br>2. Click "الفريق" tab |
| **Expected Result** | List of team members displayed |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-SET-004: Create New User
| Field | Value |
|-------|-------|
| **Preconditions** | User is admin |
| **Test Data** | First Name: محمد, Last Name: السعيد, Email: mohammed@saddah.com, Role: sales_rep |
| **Steps** | 1. Go to Settings > Team<br>2. Click "إضافة مستخدم"<br>3. Fill details<br>4. Save |
| **Expected Result** | New user created, appears in list |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-SET-005: Edit User
| Field | Value |
|-------|-------|
| **Preconditions** | User exists |
| **Test Data** | Updated Role: manager |
| **Steps** | 1. Go to Settings > Team<br>2. Click Edit on user<br>3. Change role<br>4. Save |
| **Expected Result** | User role updated |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-SET-006: Deactivate User
| Field | Value |
|-------|-------|
| **Preconditions** | Active user exists (not self) |
| **Test Data** | None |
| **Steps** | 1. Go to Settings > Team<br>2. Click on user<br>3. Toggle active status off<br>4. Save |
| **Expected Result** | User deactivated, cannot login |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-SET-007: View Integrations Tab
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | None |
| **Steps** | 1. Go to Settings<br>2. Click "التكاملات" tab |
| **Expected Result** | Integration options displayed |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-SET-008: Update Company Settings
| Field | Value |
|-------|-------|
| **Preconditions** | User is admin |
| **Test Data** | Company Name: شركة صدى العقارية |
| **Steps** | 1. Go to Settings > General<br>2. Update company name<br>3. Save |
| **Expected Result** | Settings saved |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-SET-009: Create Pipeline
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | Name: مسار الإيجارات |
| **Steps** | 1. Go to Settings > Pipelines<br>2. Click Add<br>3. Enter name<br>4. Add stages<br>5. Save |
| **Expected Result** | New pipeline created |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-SET-010: Edit Pipeline
| Field | Value |
|-------|-------|
| **Preconditions** | Pipeline exists |
| **Test Data** | Add new stage: التفاوض النهائي |
| **Steps** | 1. Go to Settings > Pipelines<br>2. Click Edit<br>3. Add stage<br>4. Save |
| **Expected Result** | Pipeline updated with new stage |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-SET-011: Delete Pipeline
| Field | Value |
|-------|-------|
| **Preconditions** | Empty pipeline exists (no deals) |
| **Test Data** | None |
| **Steps** | 1. Go to Settings > Pipelines<br>2. Click Delete<br>3. Confirm |
| **Expected Result** | Pipeline deleted |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-SET-012: Set Default Pipeline
| Field | Value |
|-------|-------|
| **Preconditions** | Multiple pipelines exist |
| **Test Data** | None |
| **Steps** | 1. Go to Settings > Pipelines<br>2. Click "Set as Default" on a pipeline |
| **Expected Result** | Pipeline marked as default |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

---

## 10. NAVIGATION & UI

### TC-NAV-001: Sidebar Navigation
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | None |
| **Steps** | 1. Click each sidebar menu item |
| **Expected Result** | Each page loads correctly |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-NAV-002: RTL Layout
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | None |
| **Steps** | 1. Verify sidebar is on right<br>2. Verify text alignment<br>3. Verify icons placement |
| **Expected Result** | Full RTL layout, Arabic text properly aligned |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-NAV-003: Global Search
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in, data exists |
| **Test Data** | Search: أحمد |
| **Steps** | 1. Click search icon in header<br>2. Enter search term<br>3. View results |
| **Expected Result** | Results show contacts, deals, companies matching term |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-NAV-004: Notifications Dropdown
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | None |
| **Steps** | 1. Click notifications bell icon<br>2. View dropdown |
| **Expected Result** | Notifications list displayed |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-NAV-005: User Menu
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | None |
| **Steps** | 1. Click user avatar/name in header<br>2. View dropdown |
| **Expected Result** | Menu shows profile, settings, logout options |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-NAV-006: Modal Close with Escape
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | None |
| **Steps** | 1. Open any modal (create lead, etc.)<br>2. Press Escape key |
| **Expected Result** | Modal closes |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-NAV-007: Modal Close with Outside Click
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | None |
| **Steps** | 1. Open any modal<br>2. Click outside modal area |
| **Expected Result** | Modal closes |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

### TC-NAV-008: Responsive Design
| Field | Value |
|-------|-------|
| **Preconditions** | User is logged in |
| **Test Data** | None |
| **Steps** | 1. Resize browser to tablet size<br>2. Resize to mobile size<br>3. Check all pages |
| **Expected Result** | Layout adapts, sidebar collapses, content readable |
| **Status** | ☐ Pass ☐ Fail ☐ Blocked |
| **Notes** | |

---

## Bug Report Template

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-XXX |
| **Test Case** | TC-XXX-XXX |
| **Summary** | |
| **Steps to Reproduce** | |
| **Expected Result** | |
| **Actual Result** | |
| **Severity** | ☐ Critical ☐ High ☐ Medium ☐ Low |
| **Screenshots** | |
| **Browser/Device** | |

---

## Test Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Tester | | | |
| Developer | | | |
| Product Owner | | | |

---

## Notes

- Test with sample data provided in seed script
- Default login: admin@saddah.com / Admin123!
- All Arabic text should display correctly
- All monetary values should show SAR currency
- Test on Chrome, Safari, and Firefox if possible
