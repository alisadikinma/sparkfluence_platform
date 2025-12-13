# 🚀 Sparkfluence Responsive Design - Claude Code Task

## Project Context
Sparkfluence adalah AI-powered SaaS untuk short-form video creation. Target users akan **primarily access via mobile/HP**, jadi responsive design adalah **CRITICAL**.

## Tech Stack
- React 18 + TypeScript + Vite
- Tailwind CSS + Shadcn UI
- Project Path: `D:\Projects\sparkfluence_platform`

## Tailwind Breakpoints
```
Mobile:  default (< 640px)
Tablet:  sm (640px)
Desktop: lg (1024px)
```

---

# PHASE 1: Core Layout Components (Priority: HIGHEST)

## 1.1 Landing Page - `src/screens/Landing/Landing.tsx`

### Issues:
- Header tidak responsive (buttons overflow)
- Feature cards tidak stack properly
- Stats section breaks on mobile
- Pricing cards tidak fit

### Tasks:
```tsx
// Header - Mobile hamburger menu
- Add state: const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
- Desktop: flex items-center gap-4
- Mobile: hamburger icon, slide-out menu

// Hero Section
- Desktop: grid md:grid-cols-2
- Mobile: single column, hide feature cards grid, show simplified version
- Stats: flex-wrap on mobile, hide dividers

// Feature Cards
- Desktop: grid-cols-2
- Mobile: grid-cols-1, smaller padding

// Pricing
- Desktop: grid-cols-3
- Mobile: grid-cols-1, swipeable carousel atau stack

// Testimonials
- Desktop: grid-cols-3  
- Mobile: grid-cols-1, carousel
```

### Responsive Patterns:
```tsx
// Navigation
<nav className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
  {/* Logo - always visible */}
  <div className="flex items-center justify-between">
    <Logo />
    
    {/* Desktop Navigation */}
    <div className="hidden lg:flex items-center gap-4">
      <Button>Login</Button>
      <Button>Sign Up</Button>
    </div>
    
    {/* Mobile Hamburger */}
    <button className="lg:hidden" onClick={() => setMobileMenuOpen(true)}>
      <Menu className="w-6 h-6" />
    </button>
  </div>
</nav>

// Mobile Menu Overlay
{mobileMenuOpen && (
  <div className="fixed inset-0 z-50 lg:hidden">
    <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
    <div className="fixed right-0 top-0 h-full w-[280px] bg-[#1a1a24] p-6">
      {/* Menu items */}
    </div>
  </div>
)}
```

---

# PHASE 2: Dashboard Responsive (Priority: HIGH)

## 2.1 Dashboard - `src/screens/Dashboard/Dashboard.tsx`

### Issues:
- Sidebar tidak collapsible
- Stats cards overflow
- Content sections break

### Tasks:
```tsx
// Sidebar - Collapsible on mobile
- Add state: const [sidebarOpen, setSidebarOpen] = useState(false)
- Desktop: sticky sidebar w-[240px]
- Mobile: fixed overlay, slide from left

// Stats Cards
- Desktop: grid-cols-4
- Tablet: grid-cols-2
- Mobile: grid-cols-1 atau grid-cols-2

// Main Content Grid
- Desktop: grid-cols-3 (2 for recent, 1 for schedule)
- Mobile: grid-cols-1, stack vertically

// Action Buttons (Create New, Gallery, Planner)
- Desktop: flex row
- Mobile: flex-wrap atau stack vertical
```

### Responsive Patterns:
```tsx
// Sidebar
const [sidebarOpen, setSidebarOpen] = useState(false);

return (
  <div className="flex min-h-screen bg-[#0a0a12]">
    {/* Mobile Overlay */}
    {sidebarOpen && (
      <div 
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={() => setSidebarOpen(false)}
      />
    )}
    
    {/* Sidebar */}
    <aside className={`
      fixed lg:sticky top-0 left-0 z-50
      w-[240px] h-screen bg-[#1a1a24]
      transform transition-transform duration-300 ease-in-out
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Sidebar content */}
    </aside>
    
    {/* Main Content */}
    <main className="flex-1 p-4 sm:p-6 lg:p-8">
      {/* Mobile Header with hamburger */}
      <div className="flex items-center gap-4 mb-6 lg:hidden">
        <button onClick={() => setSidebarOpen(true)}>
          <Menu className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Stats cards */}
      </div>
    </main>
  </div>
);
```

---

# PHASE 3: Auth Pages Responsive (Priority: MEDIUM)

## 3.1 Login - `src/screens/Login/Login.tsx`

### Issues:
- Two-column layout breaks
- Left panel wasted space on mobile

### Tasks:
```tsx
// Layout
- Desktop: grid-cols-2 (left panel + form)
- Mobile: single column, HIDE left panel completely

// Form
- Desktop: max-w-md centered
- Mobile: full width with padding
```

### Responsive Patterns:
```tsx
return (
  <div className="min-h-screen flex">
    {/* Left Panel - Hidden on mobile */}
    <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#7c3aed] to-[#ec4899]">
      {/* Branding content */}
    </div>
    
    {/* Right Panel - Form */}
    <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        {/* Form content */}
      </div>
    </div>
  </div>
);
```

## 3.2 Register - `src/screens/Register/Register.tsx`
- Same pattern as Login

---

# PHASE 4: Other Screens (Priority: MEDIUM)

## 4.1 Gallery - `src/screens/Gallery/Gallery.tsx`
```tsx
// Video Grid
- Desktop: grid-cols-4
- Tablet: grid-cols-2 atau grid-cols-3
- Mobile: grid-cols-1 atau grid-cols-2
```

## 4.2 Planner - `src/screens/Planner/Planner.tsx`
```tsx
// Calendar View
- Desktop: full calendar grid
- Mobile: list view atau simplified week view

// Sidebar
- Same collapsible pattern as Dashboard
```

## 4.3 Settings - `src/screens/Settings/Settings.tsx`
```tsx
// Tabs/Navigation
- Desktop: horizontal tabs atau sidebar
- Mobile: dropdown atau stacked tabs
```

---

# PHASE 5: Shared Components (Priority: LOW)

## 5.1 Create Reusable Components

### MobileNav Component
```tsx
// src/components/MobileNav.tsx
interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const MobileNav = ({ isOpen, onClose, children }: MobileNavProps) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[280px] bg-[#1a1a24] p-6 overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4">
          <X className="w-6 h-6 text-white" />
        </button>
        {children}
      </div>
    </div>
  );
};
```

### ResponsiveSidebar Component
```tsx
// src/components/ResponsiveSidebar.tsx
interface ResponsiveSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const ResponsiveSidebar = ({ isOpen, onClose, children }: ResponsiveSidebarProps) => {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50
        w-[240px] h-screen bg-[#1a1a24] border-r border-[#2b2b38]
        transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {children}
      </aside>
    </>
  );
};
```

---

# Testing Checklist

## Devices to Test:
- [ ] iPhone SE (375px)
- [ ] iPhone 12/13/14 (390px)
- [ ] iPhone 14 Pro Max (430px)
- [ ] iPad Mini (768px)
- [ ] iPad Pro (1024px)
- [ ] Desktop (1280px+)

## Per-Screen Checklist:

### Landing Page:
- [ ] Header hamburger menu works
- [ ] Hero section readable
- [ ] Feature cards stack properly
- [ ] Pricing cards visible
- [ ] Footer links accessible

### Dashboard:
- [ ] Sidebar slides in/out
- [ ] Stats cards readable
- [ ] Recent content visible
- [ ] Schedule section accessible
- [ ] Create button works

### Login/Register:
- [ ] Form fills screen width
- [ ] All inputs accessible
- [ ] Buttons tappable (min 44px)

### Gallery:
- [ ] Videos grid adapts
- [ ] Video cards not cropped

### Planner:
- [ ] Calendar usable
- [ ] Can create/edit events

---

# Important Notes

1. **Mobile-First**: Start dengan mobile styles, lalu add breakpoints
2. **Touch Targets**: Min 44x44px untuk buttons
3. **Font Sizes**: Min 16px untuk body text (prevent zoom on iOS)
4. **Spacing**: Use consistent spacing (p-4 sm:p-6 lg:p-8)
5. **Images**: Use object-cover dan aspect-ratio
6. **Overflow**: Prevent horizontal scroll (overflow-x-hidden)

---

# Execution Order

1. **Phase 1** - Landing (user first impression)
2. **Phase 2** - Dashboard (main user workspace)
3. **Phase 3** - Auth pages (conversion critical)
4. **Phase 4** - Other screens
5. **Phase 5** - Shared components (refactor)

Setiap phase, test di Chrome DevTools responsive mode sebelum lanjut ke phase berikutnya.
