export function workspaceRouteCapability(input: string): string | null {
  const route = input.replace(/^\/workspace\/sportpaleis(?=\/|$)/, "");
  const mapping: [RegExp, string][] = [
    [/^\/orders\/(nieuw|team|eigen-artikel)(\/|$)/, "orders.create"],
    [/^\/orders(\/|$)/, "orders.view"],
    [/^\/planning(\/|$)/, "planning.view"],
    [/^\/productie(\/|$)/, "production.view"],
    [/^\/voorstellen(\/|$)/, "teamwear.view"],
    [/^\/mail(\/|$)/, "mail.view"],
    [/^\/webshop(\/|$)/, "webshop_intake.view"],
    [/^\/studio(\/|$)/, "product_truth.propose"],
    [/^\/beheer\/(gebruikers|rollen)(\/|$)/, "management.permissions"],
    [/^\/beheer\/werknemers(\/|$)/, "management.users"],
    [/^\/beheer(\/|$)/, "management.view"],
    [/^\/winkel(\/|$)/, "orders.create"],
    [/^\/alles(\/|$)/, "orders.view"],
  ];
  return mapping.find(([pattern]) => pattern.test(route))?.[1] || null;
}
