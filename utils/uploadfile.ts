type UploadFileResponse = {
  error?: string
  imageURL?: string
}

export async function uploadFile(file: File): Promise<UploadFileResponse> {
  const getuploadurl = await fetch('/api/cloudflare/getuploadurl')
  const response = await getuploadurl.json()
  const uploadURL = response.uploadURL

  const formData = new FormData()
  formData.append('file', file)

  const upload = await fetch(uploadURL, {
    method: 'POST',
    body: formData,
  })
  const uploadResponse = await upload.json()

  if (!uploadResponse.success) return { error: JSON.stringify(uploadResponse) }

  const imageURL = uploadResponse.result.variants[0]

  return { imageURL }
}
