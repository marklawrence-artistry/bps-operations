# Welcome!
## BPS (Bicodo Postal Services) Records Management System

IDOP - Bicodo Postal Services is a logistics drop-off point handling transactions for platforms like Shopee and Lazada. Their internal administrative processes are currently disjointed and manual.

We have identified three key administrative features that this system aims to resolve:
- Fragmented Seller Data: Critical contact details for their partner sellers are currently stored in the owner's personal mobile phone contacts. This makes the data inaccessible to other staff and difficult to manage or search.
- Unmanaged Internal Inventory: The business relies on office supplies (tape, markers, waybills) to operate. Currently, there is no tracking for these items, leading to stock shortages that can disrupt daily records.
- Manual Sales Calculation: Revenues can be viewed at the system of Lazada/Shoppee but it can't track it, making it tedious to generate weekly or monthly performance reports.

### A. General Features
- A secure login system that differentiates between Administrator (Owner) and Staff accounts to control access levels.
- A main overview page displaying summary cards.
- A mobile-friendly design allowing users to access the system via desktop computers, tablets, or smartphones.
- A tracking module that records user activities (logins, data modifications) for accountability and security.
- A dedicated module to create backups of the database to ensure data integrity in case of system failure.
- Functionality for the Administrator to create, update, and manage staff accounts and permissions.
### B. System-Specific Features
Based on BPS Records Management System, features may include:
- Inventory Management: A core module to manage "Stock IN" (Inbound) and "Stock OUT" (Outbound) company items and equipment, including support for uploading product images. Ensure older items are dispatched first.
- Low Stock Alerts: A monitoring feature for internal supplies (pouches, waybills etc.) that notifies the admin when stock levels fall below a set threshold.
- Seller Information System: A directory to manage seller profiles, including CRUD records, profile pictures, contact details, and product categorization (Shoes, Gadgets etc.) for easy searching and filtering.
- Return-to-Sender Module: A dedicated log for managing cancelled or returned items, associating them with the specific product and seller for record-keeping.
- Sales & Commission Tracker: A module allowing manual input of weekly/daily sales figures, which generates an end-of-month view calculating total commissions and revenue.
- Document Expiration Tracker: A file management system for business permits and documents that sends automated email notifications (via Brevo) when a document is approaching its expiration date.
- Advanced Reporting: Generation of printable documents (PDF) and visual analytics (Charts/Graphs) for sales performance and inventory status.
### V. System Architecture
- Frontend (Client-Side): HTML5, CSS3, JavaScript
- Backend (Server-Side): NodeJS with ExpressJS Framework
- Server Environment: NodeJS Runtime
- Database: SQLite3 (File-based relational database)
- Architecture: RESTful API / Client-Server Model (Web Browser <-> Express/NodeJS <-> SQLite3)
- Security: JWT/Session-based authentication, Input validation/sanitization, Role-Based Access Control (RBAC).
### VI. Technology Stack
- Server Stack: NodeJS Runtime Environment
- Programming Language: JavaScript (Backend & Frontend)
- Framework: ExpressJS (Backend)
- Database: SQLite3
- Frontend: HTML, CSS, JavaScript
- Notification Service: Brevo (Email API)
- Deployment/Cloud: Railway
- Reporting: Chart.js (for analytics) and PDF generation libraries
- Version Control: Git & GitHub
### VII. Project Deliverables
- Fully functional Web-Based System titled BPS Records Management System.
- A centralized SQLite3 database with all necessary schemas, tables, and relationships.
- System deployed and configured on Railway (Cloud Hosting) with volume storage.
- User accounts with distinct access levels (Admin and Staff).
- Complete System Documentation (User Manual & Technical Documentation).
- ERD, Data Flow Diagrams, and System Architecture diagrams.
- Final project presentation and source code repository.

----

### Programmers
Backend Programmer: Mark Lawrence
Frontend Programmer: Mavien
