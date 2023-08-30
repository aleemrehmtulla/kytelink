type UploadFileResponse = {
  error?: string
  imageURL?: string
  blurpfp?: string
}

export async function uploadFile(file: File, isPfp?: boolean): Promise<UploadFileResponse> {
  const getuploadurl = await fetch('/api/images/getuploadurl')
  const response = await getuploadurl.json()
  const uploadURL = response.uploadURL

  const formData = new FormData()
  formData.append('file', file)

  const upload = await fetch(uploadURL, { method: 'POST', body: formData })
  const uploadResponse = await upload.json()
  if (!uploadResponse.success) return { error: uploadResponse.errors[0].message }

  const imageURL = uploadResponse.result.variants[0]

  if (!isPfp) return { imageURL: imageURL }

  const createblurpfp = await fetch('/api/images/createblurpfp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageurl: imageURL }),
  })

  const { blurpfp } = await createblurpfp.json()

  return { imageURL: imageURL, blurpfp: blurpfp }
}
