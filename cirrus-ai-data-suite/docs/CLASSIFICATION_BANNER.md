# Classification Banner

The application includes a classification banner that displays at the top of every page to indicate the security classification level of the system in accordance with DoDM 5200.01.

## Configuration

### Classification Level

Set the classification level using the `NEXT_PUBLIC_CLASSIFICATION_LEVEL` environment variable in your `.env.local` file:

```env
NEXT_PUBLIC_CLASSIFICATION_LEVEL=UNCLASSIFIED
```

### Additional Markings

Add dissemination control markings using the `NEXT_PUBLIC_CLASSIFICATION_MARKINGS` environment variable (comma-separated):

```env
NEXT_PUBLIC_CLASSIFICATION_MARKINGS=NOFORN
# or multiple markings
NEXT_PUBLIC_CLASSIFICATION_MARKINGS=NOFORN,REL TO USA, FVEY
```

## Supported Classification Levels

| Level | Background Color | Text Color | Use Case |
|-------|------------------|------------|----------|
| `UNCLASSIFIED` | Green | White | Public or unclassified information |
| `CUI` | Purple | White | Controlled Unclassified Information |
| `CONFIDENTIAL` | Blue | White | Confidential classified information |
| `SECRET` | Red | White | Secret classified information |
| `TOP SECRET` | Orange | White | Top Secret classified information |
| `TOP SECRET//SCI` | Yellow | Black | Top Secret with SCI controls |

## Features

- **Sticky Position**: Banner remains fixed at the top of the page
- **High Z-Index**: Ensures banner appears above all other content
- **Responsive**: Works across all screen sizes
- **Persistent**: Appears on all pages throughout the application
- **Layout Adjustment**: AppLayout automatically adjusts for banner height

## Supported Dissemination Control Markings (DoDM 5200.01)

### Distribution Statements
- `NOFORN` - Not Releasable to Foreign Nationals
- `REL TO USA` - Releasable to USA only
- `REL TO USA, FVEY` - Releasable to USA and Five Eyes (UK, Canada, Australia, New Zealand)
- `REL TO USA, NATO` - Releasable to USA and NATO countries
- `FOUO` - For Official Use Only
- `LES` - Law Enforcement Sensitive

### Handling Caveats
- `ORCON` - Originator Controlled
- `PROPIN` - Proprietary Information
- `RELIDO` - Releasable by Information Disclosure Official
- `EXDIS` - Exclusive Distribution
- `NODIS` - No Distribution
- `CLOSE HOLD` - Close Hold

### Special Access Program (SAP) Markings
- `TK` - Talent Keyhole
- `HCS` - HUMINT Control System
- `SI` - Special Intelligence
- `GAMMA` - GAMMA
- `CNWDI` - Critical Nuclear Weapon Design Information

## Examples

### Basic Classification
```env
NEXT_PUBLIC_CLASSIFICATION_LEVEL=SECRET
```
Result: `SECRET`

### With NOFORN
```env
NEXT_PUBLIC_CLASSIFICATION_LEVEL=SECRET
NEXT_PUBLIC_CLASSIFICATION_MARKINGS=NOFORN
```
Result: `SECRET//NOFORN`

### Multiple Markings
```env
NEXT_PUBLIC_CLASSIFICATION_LEVEL=TOP SECRET
NEXT_PUBLIC_CLASSIFICATION_MARKINGS=SI,TK,NOFORN
```
Result: `TOP SECRET//SI//TK//NOFORN`

## Default Behavior

If no classification level is set, the banner will not be displayed. This allows the application to run without a classification banner in development or unclassified environments.

## Implementation Details

- Component: `/src/components/ClassificationBanner.tsx`
- Integration: Added to root layout in `/src/app/layout.tsx`
- Styling: Uses Tailwind CSS classes for consistent appearance
- Layout spacing: AppLayout includes `pt-7` padding to account for banner height
- Compliance: Follows DoDM 5200.01 Volume 2 for classification markings