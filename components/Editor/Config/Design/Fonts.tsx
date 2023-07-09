import { useEffect, useState } from 'react'

import { Box, Heading, Text, VStack, Center, SimpleGrid } from '@chakra-ui/react'
import { FiChevronRight, FiChevronLeft } from 'react-icons/fi'

import { TUser } from 'types/user'

import { COLORS, FONTS } from 'consts/fonts'

type FontProps = {
  user: TUser
  setUser: (user: TUser) => void
}

const Fonts = ({ user, setUser }: FontProps) => {
  const [font, setFont] = useState({
    ...FONTS[0],
    default: true,
  }) as any

  const [textColor, setTextColor] = useState({
    ...COLORS[0],
    default: true,
  }) as any

  // not sure if this is effcent. BUT. it'll set the correct default state
  useEffect(() => {
    if (user.customFont && font.default === true) {
      setFont(FONTS.find((font) => font.key === user.customFont))
    }
    if (user.customColor && font.default === true) {
      setTextColor(COLORS.find((color) => color.key === user.customColor))
    }
  }, [user.customFont, user.customColor])

  const changeFont = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      if (font?.key === FONTS[0].key) {
        setFont(FONTS[FONTS.length - 1])
        setUser({ ...user, customFont: FONTS[FONTS.length - 1].key })
      } else {
        setFont(FONTS[FONTS.indexOf(font) - 1])
        setUser({ ...user, customFont: FONTS[FONTS.indexOf(font) - 1].key })
      }
    } else {
      if (font?.key === FONTS[FONTS.length - 1].key) {
        setFont(FONTS[0])
        setUser({ ...user, customFont: FONTS[0].key })
      } else {
        setFont(FONTS[FONTS.indexOf(font) + 1])
        setUser({ ...user, customFont: FONTS[FONTS.indexOf(font) + 1].key })
      }
    }
  }
  const changeColor = (color: typeof COLORS[0]) => {
    setTextColor(color)
    setUser({ ...user, customColor: color.key })
  }

  return (
    <>
      <Box border="1px" borderWidth={2} borderColor="gray.100" dropShadow="md" rounded="lg" p={4}>
        <Heading fontSize="2xl" pb={2}>
          Text Decoration
        </Heading>
        <VStack spacing={4}>
          <Center w="full" justifyContent="space-between" h="12" px={2}>
            <Box
              _hover={{ color: 'gray.400' }}
              transitionDuration="0.2s"
              as={FiChevronLeft}
              cursor="pointer"
              onClick={() => changeFont('left')}
              size="20px"
            />
            <Heading
              textAlign="center"
              fontFamily={font?.key !== 'default ' ? font?.key : 'sans-serif'}
              fontSize={{ base: 'sm', md: 'md', xl: font?.size }}
            >
              {font.name === 'Default'
                ? 'Default theme text (arrows to change) '
                : `
              This is how ${font.name} looks like`}
            </Heading>
            <Box
              _hover={{ color: 'gray.400' }}
              transitionDuration="0.2s"
              as={FiChevronRight}
              cursor="pointer"
              onClick={() => changeFont('right')}
              size="20px"
            />
          </Center>

          <SimpleGrid columns={{ base: 4, xl: COLORS.length }} pt={{ base: 2, md: 0 }} spacing={6}>
            {COLORS.map((color, index) => (
              <VStack key={index}>
                <Center
                  border={
                    color.key === 'white' ? '1px' : textColor.key === color.key ? '2px' : '0px'
                  }
                  borderColor={
                    textColor.key === color.key && color.key === 'white'
                      ? 'blue.400'
                      : textColor.key === 'blue.400'
                      ? 'black'
                      : textColor.key !== color.key && color.key === 'white'
                      ? 'black'
                      : 'blue.400'
                  }
                  borderWidth={
                    textColor.key !== color.key && color.key === 'white' ? '1px' : '3.2px'
                  }
                  rounded="md"
                  w={10}
                  p={1}
                  h={10}
                  bg={color.key === 'default' ? 'gray.400' : color.key}
                  onClick={() => changeColor(color)}
                  cursor="pointer"
                >
                  <Text h="5" fontSize="lg" fontWeight="semibold" textAlign="center">
                    {color.key === 'default' && '*'}
                  </Text>
                </Center>

                <Text>{color.name}</Text>
              </VStack>
            ))}
          </SimpleGrid>
        </VStack>
      </Box>
    </>
  )
}
export default Fonts
