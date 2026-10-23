# CashbookPro

This is a NextJS application for managing business finances, including customers, items, transactions, and reminders.

## Getting Started

To get started, run the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:9002`.

## QA Checklist

Here are some checks to run after modifying a module:

1.  **Authentication**: Signup and Login should work correctly, and the active user session should persist after closing the app.
2.  **Localization**: The language toggle (English/Urdu) should switch the UI text and apply RTL layout for Urdu correctly.
3.  **Dashboard**: The dashboard should greet the logged-in user by name and display all six quick action buttons.
4.  **Add Customer**: The "Add Customer" form should save new customers, which should then appear in the customer list.
5.  **Add Item**: The "Add Item" form should save new items. If a new supplier is entered, they should be automatically added to the customer list.
6.  **Transactions**: Both "Quick Sale" from the items page and manual transaction entry should save correctly and update the corresponding customer's balance.
7.  **Reminders**: Reminders should save correctly, and any pending reminders should appear on the dashboard.
8.  **Reports**: The customer report should correctly identify and flag customers with balances overdue for more than one week.
9.  **Premium Features**: The premium feature lock should be visible on gated features. The "Activate" button on the premium page should successfully simulate unlocking these features.
10. **UI Stability**: Navigate through the app and ensure there are no "uncontrolled to controlled input" warnings in the developer console.

## Developer Notes

- Adhere strictly to the features and UI specified in the prompts. Do not add any new functionality or UI elements without explicit instruction.
- The "Customer View" mode must always be stripped of sensitive financial data, specifically item purchase prices and supplier details.
- User-specific settings like `viewMode` and `language` should be stored and retrieved from their respective keys in localStorage.
- If an error occurs that requires a fix, provide the console stack trace and the exact prompt that caused the error to allow for a targeted and efficient resolution.
