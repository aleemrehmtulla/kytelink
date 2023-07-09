import { Box, Tabs, TabList, Tab, TabPanel, TabPanels } from '@chakra-ui/react'
import { useRouter } from 'next/router'

import { TUser } from 'types/user'

import Analyitcs from './Analytics'
import Design from './Design'
import Links from './Links'
import Settings from './Settings'

type ConfigProps = {
  user: TUser
  setUser: (user: TUser) => void
  route: string
}

const Config = ({ user, setUser, route }: ConfigProps) => {
  const router = useRouter()

  const ROUTES = ['links', 'design', 'analytics', 'settings']
  const defaultIndex = ROUTES.indexOf(route) >= 0 ? ROUTES.indexOf(route) : 0

  return (
    <>
      <Box
        borderLeft="1px"
        borderColor={{ base: 'transparent', lg: 'gray.200' }}
        mt={{ base: 12, md: 0 }}
        w="full"
      >
        <Tabs
          defaultIndex={defaultIndex}
          onChange={(index) => router.push({ pathname: `/edit/${ROUTES[index]}` })}
          px={{ base: 0, md: 28 }}
          mt={{ base: 0, md: 20 }}
        >
          <TabList>
            {ROUTES.map((route) => (
              <Tab
                fontSize={{ base: 'xs', sm: 'sm', md: 'md', lg: 'lg' }}
                _focus={{ border: 'none' }}
              >
                {route.charAt(0).toUpperCase() + route.slice(1)}
              </Tab>
            ))}
          </TabList>

          <TabPanels>
            {[Links, Design, Analyitcs, Settings].map((Component) => (
              <TabPanel p={0} py={6}>
                <Component user={user} setUser={setUser} />
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </Box>
    </>
  )
}
export default Config
