export function remoteAction(id: string) {
  return async (...args: any[]) => {
    if (id === "$login") {
      const csrf = await fetch("/api/auth/csrf", { cache: "no-store" }).then(
        (r) => r.json(),
      );
      const response = await fetch("/api/auth/signin/google", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "X-Auth-Return-Redirect": "1",
        },
        body: new URLSearchParams({
          csrfToken: csrf.csrfToken,
          callbackUrl: new URL("/dashboard", location.origin).href,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.url)
        throw new Error("Unable to start Google sign-in. Please try again.");
      location.assign(result.url);
      return;
    }
    if (id === "app/actions/auth.ts#logout") {
      await fetch("/api/edge/logout", { method: "POST" });
      location.assign("/login");
      return;
    }
    const form = new FormData();
    const encoded = args.map((arg, index) => {
      if (arg instanceof FormData) {
        for (const [name, value] of arg) form.append(`${index}:${name}`, value);
        return { $form: index };
      }
      return arg;
    });
    form.set("$args", JSON.stringify(encoded));
    const response = await fetch(
      `/api/edge/action?id=${encodeURIComponent(id)}`,
      { method: "POST", body: form },
    );
    const result = await response.json();
    if (result.redirect) {
      location.assign(result.redirect);
      return;
    }
    if (!response.ok)
      throw new Error(result.error ?? "Unable to save. Please try again.");
    window.dispatchEvent(new Event("transfers:refresh"));
    return result.value;
  };
}
