import type { NextPage } from 'next'
import { Container, Flex } from '@chakra-ui/react'
import LandingHeader from './Headers/LandingHeader'

const LandingLayout: NextPage = ({ children }) => {
  return (
    <Flex direction="column" align="center">
      <LandingHeader />
      <Container maxW="container.2xl" pt={'72px'}>
        {children}
      </Container>
    </Flex>
  )
}
export default LandingLayout
