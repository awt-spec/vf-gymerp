import { useParams, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Landing from "./Landing";
import GenericGymLanding from "./GenericGymLanding";

type GymData = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export default function GymLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [gym, setGym] = useState<GymData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("gyms")
      .select("id, name, slug, logo_url, primary_color, phone, email, address")
      .eq("slug", slug)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else setGym(data);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !gym) return <Navigate to="/" replace />;

  // Elevate gets its custom branded landing (matches "elevate", "elevate-lindora", etc.)
  if (gym.slug.startsWith("elevate")) {
    return <Landing gymSlug={gym.slug} />;
  }

  // All other gyms get the generic white-label landing
  return <GenericGymLanding gym={gym} />;
}
