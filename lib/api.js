// فراخوانی API از سمت کلاینت
export async function api(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) throw new Error(data?.error || 'خطا در ارتباط با سرور');
  return data;
}
