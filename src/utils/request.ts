// request.ts
// async function postRequest<T>(url: string, data: T): Promise<any> {
//   try {
//     const response = await fetch(url, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(data),
//     })

//     if (!response.ok)
//       throw new Error(`HTTP error! status: ${response.status}`)

//     return await response.json()
//   }
//   catch (error) {
//     console.error('Error making POST request:', error)
//     throw error
//   }
// }

// export default postRequest
