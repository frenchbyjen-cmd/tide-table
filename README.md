
# IMPORTANT — V2 Netlify Blobs setup

This V2 explicitly supplies Netlify Blobs with the site ID and a private token.

## ONE-TIME SETUP ON NETLIFY

### 1. Create a Netlify Personal Access Token
In your Netlify user settings:
- Applications
- Personal access tokens
- New access token
- Give it a name such as `Tide Table Blobs`
- Copy the token immediately and keep it private

### 2. Add it to THIS Netlify project
In the project:
- Project configuration
- Environment variables
- Add a variable

Name:
`NETLIFY_BLOBS_TOKEN`

Value:
paste the token

If Netlify asks for a scope, make sure **Functions** can access it.

Never paste this token into the source code or commit it to GitHub.

### 3. Trigger a new deploy
Environment variable changes only apply after a new deploy.

### 4. Test the backend health endpoint
Open:

`https://YOUR-SITE.netlify.app/.netlify/functions/health`

A healthy result should contain:

`"ok": true`

Then test:

`https://YOUR-SITE.netlify.app/.netlify/functions/orders`

Expected first response:

`{"orders":[]}`

Only after those two tests succeed, test the customer order flow.

---

# TIDE TABLE — Restaurant QR Ordering Demo

A mobile-first restaurant demo built for dine-in QR ordering.

## What works
- Table-specific URL: `/?table=7`
- FR / EN / ES
- Mobile menu with product photos
- Upsells / extras
- Cart and order sending
- Additional orders from the same table
- Call waiter
- Ask for bill
- `/staff` live dashboard
- Order lifecycle: New → Preparing → Ready → Served
- Simple revenue / extras analytics
- `/demo-qr` printable QR
- Shared data across devices through Netlify Blobs

## Staff PIN
`2026`

## Deploy on Netlify

### Easiest method
1. Unzip the project.
2. Put it in a GitHub repository, or use Netlify's project import.
3. Netlify detects:
   - build command: `npm run build`
   - publish directory: `dist`
   - functions directory: `netlify/functions`
4. Deploy.
5. Open:
   - Client: `https://YOUR-SITE.netlify.app/?table=7`
   - Staff: `https://YOUR-SITE.netlify.app/staff`
   - Printable QR: `https://YOUR-SITE.netlify.app/demo-qr`

The Netlify Blobs API is used by the Functions at runtime. No database credentials are stored in this project.

## Test before the restaurant meeting

Use TWO different devices:
1. On phone A open `/?table=7`.
2. Add Chicken Burger + Cheese + Fries + Soft drink.
3. Send order.
4. On device B open `/staff`, PIN `2026`.
5. The order should appear within ~2 seconds.
6. Accept → Preparing.
7. Phone A: order another Coca-Cola.
8. Device B: check "ADDITIONAL ORDER".
9. Phone A: Ask for the bill.
10. Device B: check "BILL REQUESTED".

## Customize a restaurant

Edit `src/config.js`.

### Identity
Change:
- `restaurant.name`
- `restaurant.subtitle`
- `restaurant.heroImage`
- `restaurant.staffPin`

### Menu
Edit the `menu` array:
- product name
- price
- category
- description
- image
- extras

### Categories
Edit the `categories` array.

### Languages
Edit `translations`.

### Table QR
Any table works through:
`/?table=NUMBER`

Examples:
- `/?table=1`
- `/?table=12`
- `/?table=terrace-4`

## Important production notes
This is a polished commercial demo / MVP. Before a large production rollout:
- add real staff authentication
- split data by restaurant tenant ID
- add rate limiting / validation
- connect to POS/kitchen printer if required
- define data retention
- add monitoring and backups
