import { useEffect, useState } from 'react'
import { Image } from '@chakra-ui/react'

const LandingDemo = () => {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerWidth < 768) return

      const newScale = 1 + window.scrollY * 0.0006

      if (newScale > 1.28) return

      setScale(newScale)
    }

    window.addEventListener('scroll', handleScroll)

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return <Image src="/assets/landing/top.png" alt="Landing Image" transform={`scale(${scale})`} />
}

export default LandingDemo
