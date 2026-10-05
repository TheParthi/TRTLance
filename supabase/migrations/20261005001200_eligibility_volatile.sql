-- arbitrator_eligibility calls app.require_user(), which can raise, so it is volatile too.
alter function public.arbitrator_eligibility() volatile;
