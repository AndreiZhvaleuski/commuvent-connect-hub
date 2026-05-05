import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import SignIn from "./pages/SignIn.tsx";
import { Placeholder } from "./pages/Placeholder.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/explore" element={<Placeholder title="Explore events" />} />
            <Route path="/e/:eventId" element={<Placeholder title="Event" />} />
            <Route path="/h/:slug" element={<Placeholder title="Host" />} />
            <Route path="/sign-in" element={<SignIn mode="signin" />} />
            <Route path="/sign-up" element={<SignIn mode="signup" />} />
            <Route path="/tickets" element={<Placeholder title="My Tickets" />} />
            <Route path="/my-events" element={<Placeholder title="My Events" />} />
            <Route path="/become-a-host" element={<Placeholder title="Become a host" />} />
            <Route path="/dashboard" element={<Placeholder title="Dashboard" />} />
            <Route path="/dashboard/:hostId" element={<Placeholder title="Host dashboard" />} />
            <Route path="/dashboard/:hostId/events/new" element={<Placeholder title="New event" />} />
            <Route path="/dashboard/:hostId/events/:eventId/edit" element={<Placeholder title="Edit event" />} />
            <Route path="/dashboard/:hostId/events/:eventId/rsvps" element={<Placeholder title="Event RSVPs" />} />
            <Route path="/dashboard/:hostId/members" element={<Placeholder title="Members" />} />
            <Route path="/dashboard/:hostId/moderation" element={<Placeholder title="Moderation" />} />
            <Route path="/checkin/:eventId" element={<Placeholder title="Check-in" />} />
            <Route path="/invite/:token" element={<Placeholder title="Invite" />} />
            <Route path="/about" element={<Placeholder title="About Commuvent" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
