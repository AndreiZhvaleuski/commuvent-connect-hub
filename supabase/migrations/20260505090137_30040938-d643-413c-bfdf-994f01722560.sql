DO $seed$
DECLARE
  v_host_id    uuid := '11111111-1111-1111-1111-111111111111';
  v_upcoming   uuid := '22222222-2222-2222-2222-222222222221';
  v_past       uuid := '22222222-2222-2222-2222-222222222222';
  v_invite_id  uuid := '33333333-3333-3333-3333-333333333333';
  v_invite_tok text := 'demo-checker-invite-token';
  i int;
  v_user uuid;
  v_rsvp uuid;
BEGIN
  -- Host
  INSERT INTO public.hosts (id, name, slug, logo_url, bio, contact_email)
  VALUES (
    v_host_id, 'Riverside Community Club', 'riverside-community-club',
    'https://api.dicebear.com/7.x/shapes/svg?seed=riverside',
    'A friendly neighborhood club hosting free events along the riverside — talks, workshops, picnics and more.',
    'hello@riverside.example.com'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, slug = EXCLUDED.slug, logo_url = EXCLUDED.logo_url,
    bio = EXCLUDED.bio, contact_email = EXCLUDED.contact_email;

  -- Upcoming event
  INSERT INTO public.events (id, host_id, title, slug, description, cover_image_url,
    start_at, end_at, time_zone, venue_address, capacity, visibility, status, is_paid)
  VALUES (
    v_upcoming, v_host_id, 'Riverside Sunset Picnic', 'riverside-sunset-picnic',
    E'Join us for our seasonal sunset picnic by the river.\n\nBring a blanket, good vibes, and a snack to share. Live acoustic music from local artists.',
    'https://images.unsplash.com/photo-1530023367847-a683933f4172?auto=format&fit=crop&w=1600&q=80',
    now() + interval '14 days', now() + interval '14 days' + interval '3 hours',
    'Europe/Berlin', 'Riverside Park, Bandstand Lawn', 50, 'public', 'published', false
  )
  ON CONFLICT (id) DO UPDATE SET
    start_at = now() + interval '14 days',
    end_at   = now() + interval '14 days' + interval '3 hours',
    status = 'published', visibility = 'public';

  -- Past event
  INSERT INTO public.events (id, host_id, title, slug, description, cover_image_url,
    start_at, end_at, time_zone, venue_address, capacity, visibility, status, is_paid)
  VALUES (
    v_past, v_host_id, 'Spring Cleanup & Coffee', 'spring-cleanup-and-coffee',
    E'Our spring riverside cleanup followed by free coffee and pastries.\n\nThanks to everyone who showed up!',
    'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1600&q=80',
    now() - interval '14 days', now() - interval '14 days' + interval '2 hours',
    'Europe/Berlin', 'Riverside Park, North Entrance', 30, 'public', 'published', false
  )
  ON CONFLICT (id) DO UPDATE SET
    start_at = now() - interval '14 days',
    end_at   = now() - interval '14 days' + interval '2 hours',
    status = 'published', visibility = 'public';

  -- 20 demo auth users + profiles + RSVPs + 15 check-ins (idempotent)
  IF NOT EXISTS (SELECT 1 FROM public.rsvps WHERE event_id = v_past) THEN
    FOR i IN 1..20 LOOP
      v_user := ('99999999-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid;

      INSERT INTO auth.users (
        id, instance_id, aud, role, email,
        encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token,
        recovery_token, email_change_token_new, email_change
      )
      VALUES (
        v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'demo' || i || '@riverside.example.com',
        crypt('demo-password-' || i, gen_salt('bf')),
        now() - interval '30 days',
        '{"provider":"seed","providers":["seed"]}'::jsonb,
        jsonb_build_object('display_name', 'Demo Attendee ' || i),
        now() - interval '30 days', now() - interval '30 days',
        '', '', '', ''
      )
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.profiles (id, display_name)
      VALUES (v_user, 'Demo Attendee ' || i)
      ON CONFLICT (id) DO NOTHING;

      v_rsvp := gen_random_uuid();
      INSERT INTO public.rsvps (id, event_id, user_id, status, code, position, created_at)
      VALUES (
        v_rsvp, v_past, v_user, 'going',
        upper(substr(replace(v_rsvp::text, '-', ''), 1, 6)),
        NULL,
        now() - interval '20 days' + (i || ' minutes')::interval
      );

      IF i <= 15 THEN
        INSERT INTO public.check_ins (rsvp_id, event_id, checked_in_at, undone)
        VALUES (v_rsvp, v_past,
          now() - interval '14 days' + (i || ' minutes')::interval, false);
      END IF;
    END LOOP;
  END IF;

  -- Demo checker invite
  INSERT INTO public.host_invites (id, host_id, role, token, expires_at)
  VALUES (v_invite_id, v_host_id, 'checker', v_invite_tok, now() + interval '90 days')
  ON CONFLICT (id) DO UPDATE SET
    token = EXCLUDED.token, role = EXCLUDED.role,
    expires_at = now() + interval '90 days';
END
$seed$;