import { useEffect, useState } from 'react'
import { Image } from '@chakra-ui/react'

const LandingDemo = () => {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const handleScroll = () => {
      const newScale = 1 + window.scrollY * 0.0006

      if (newScale > 1.28) return

      setScale(newScale)
    }

    window.addEventListener('scroll', handleScroll)

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <Image
        src="/assets/landing/kyte.gif"
        display={{ base: 'none', lg: 'block' }}
        alt="Landing Image"
        width="50%"
        rounded="md"
        transform={`scale(${scale})`}
      />
      <Image
        src="/assets/landing/kyte-mobile.gif"
        display={{ base: 'block', lg: 'none' }}
        alt="Landing Image"
        w={{ base: '75%', md: '35%' }}
      />
    </>
  )
}

export default LandingDemo
