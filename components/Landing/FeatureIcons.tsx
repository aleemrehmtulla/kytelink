import { HStack, SimpleGrid, Text } from '@chakra-ui/react'

import { FaRegSmileBeam } from 'react-icons/fa'
import { GrDomain } from 'react-icons/gr'
import { RiPaintFill } from 'react-icons/ri'
import { TbBrandGoogleAnalytics } from 'react-icons/tb'

const FEATURES = [
  {
    title: 'Simple Setup',
    icon: <FaRegSmileBeam size={24} />,
  },
  {
    title: 'Unique Themes',
    icon: <RiPaintFill size={24} />,
  },
  {
    title: 'Free Analytics',
    icon: <TbBrandGoogleAnalytics size={24} />,
  },
  {
    title: 'Custom Domains',
    icon: <GrDomain size={24} />,
  },
]

const FeatureIcons = () => {
  return (
    <SimpleGrid
      pt={12}
      columns={{ base: 2, md: 1 }}
      spacingY={{ base: 6, md: 0 }}
      spacingX={{ base: 0, md: 6 }}
      display={{ base: 'grid', md: 'flex' }}
    >
      {FEATURES.map((feature) => (
        <HStack spacing={1} key={feature.title}>
          {feature.icon}
          <Text fontSize={{ base: 'md', md: 'xl' }} pl={2}>
            {feature.title}
          </Text>
        </HStack>
      ))}
    </SimpleGrid>
  )
}
export default FeatureIcons
