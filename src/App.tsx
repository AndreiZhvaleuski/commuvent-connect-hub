import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import SignIn from "./pages/SignIn.tsx";

import HostEditor from "./pages/HostEditor.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import HostDashboard from "./pages/HostDashboard.tsx";
import EventEditor from "./pages/EventEditor.tsx";
import HostPublic from "./pages/HostPublic.tsx";
import Explore from "./pages/Explore.tsx";
import EventPage from "./pages/EventPage.tsx";
import EventGalleryPage from "./pages/EventGallery.tsx";
import Tickets from "./pages/Tickets.tsx";
import CheckIn from "./pages/CheckIn.tsx";
import EventRsvps from "./pages/EventRsvps.tsx";
import About from "./pages/About.tsx";
import Moderation from "./pages/Moderation.tsx";
import EventManage from "./pages/EventManage.tsx";
import HostMembers from "./pages/HostMembers.tsx";
import InviteAccept from "./pages/InviteAccept.tsx";
import ScrollToTop from "./components/scroll-to-top";
import MyEvents from "./pages/MyEvents.tsx";
import { AppLayout } from "./components/app-layout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/e/:eventId" element={<EventPage />} />
              <Route path="/e/:eventId/gallery" element={<EventGalleryPage />} />
              <Route path="/h/:id" element={<HostPublic />} />
              <Route path="/sign-in" element={<SignIn mode="signin" />} />
              <Route path="/sign-up" element={<SignIn mode="signup" />} />
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/my-events" element={<MyEvents />} />
              <Route path="/become-a-host" element={<HostEditor mode="create" />} />
              <Route path="/dashboard/:hostId/edit" element={<HostEditor mode="edit" />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/:hostId" element={<HostDashboard />} />
              <Route path="/dashboard/:hostId/events/new" element={<EventEditor />} />
              <Route path="/dashboard/:hostId/events/:eventId" element={<EventManage />} />
              <Route path="/dashboard/:hostId/events/:eventId/edit" element={<EventEditor />} />
              <Route path="/dashboard/:hostId/events/:eventId/rsvps" element={<EventRsvps />} />
              <Route path="/dashboard/:hostId/members" element={<HostMembers />} />
              <Route path="/dashboard/:hostId/moderation" element={<Moderation />} />
              <Route path="/checkin/:eventId" element={<CheckIn />} />
              <Route path="/invite/:token" element={<InviteAccept />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
