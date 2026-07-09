# Firestore Security Specification - SACRED CAFE POS

## 1. Data Invariants
- Products must have a valid name, category, and non-negative price.
- Discounts must have a valid duration (startDate < endDate).
- Sales must record the items, totals, and the user who processed it.
- InventoryLogs must be linked to a valid productId.

## 2. The "Dirty Dozen" Payloads (Test Cases)
1. **Unauthorized Write**: Attempt to create a product without being authenticated.
2. **Schema Break**: Attempt to create a product with a negative price.
3. **Identity Spoof**: Attempt to record a sale with a `userId` different from the authenticated user.
4. **Invalid State**: Attempt to update a sale record (sales should be immutable).
5. **Orphaned Record**: Attempt to create an inventory log for a non-existent product.
6. **Discount Poisoning**: Attempt to create a discount with `value > 100` for a percentage type.
7. **Path Poisoning**: Attempt to use an extremely long ID string.
8. **Malicious Field**: Attempt to inject a `role: "admin"` field into a user document by a non-admin.
9. **Update Gap**: Attempt to update immutable fields like `timestamp` in a sale.
10. **Bulk Delete**: Attempt to delete the entire products collection.
11. **PII Leak**: Attempt to read user profiles without being self or admin.
12. **Zero-Trust Bypass**: Attempt to read all sales as a Guest.

## 3. Implementation Plan
- `isValidProduct(data)`: Validates product shape.
- `isValidSale(data)`: Validates sale shape and integrity.
- `isAdmin()`: Check if user is an admin.
- `isCashier()`: Check if user is a cashier.

*Note: Since we are using a custom login system for now, we will allow read/write for authenticated users.*
