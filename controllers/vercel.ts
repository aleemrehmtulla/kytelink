export const addDomainToVercel = async (domain: string) => {
  const URL = `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT}/domains?teamId=${process.env.VERCEL_TEAM}`

  const data = { name: domain }

  const response = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
    },
    body: JSON.stringify(data),
  })

  const json = await response.json()

  return json
}

export const checkDomainOnVercel = async (domain: string) => {
  const response = await fetch(
    `https://api.vercel.com/v6/domains?teamId=${process.env.VERCEL_TEAM}/${domain}/config`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      },
    }
  )
  const json = await response.json()

  if (!!json.error == true) {
    return true
  }

  return json.misconfigured
}

export const deleteDomainFromVercel = async (domain: string) => {
  await fetch(
    `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT}/domains/${domain}?teamId=${process.env.VERCEL_TEAM}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      },
    }
  )
}
