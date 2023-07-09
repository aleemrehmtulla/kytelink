/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-ignore - ts doesn't know about the extension.

import { Box, Flex, HStack, useToast } from '@chakra-ui/react'
import ICON_OPTIONS from 'consts/icons'
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd'
import { GrAddCircle } from 'react-icons/gr'
import { TIcon, TUser } from 'types/user'

import { reorder } from './Helper'
import Icon from './Icon'

type LinksProps = {
  user: TUser
  setUser: (user: TUser) => void
  setSelectedIcon: (icon: any) => void
  setModalOpen: (open: boolean) => void
}

const Icons = ({ user, setUser, setSelectedIcon, setModalOpen }: LinksProps) => {
  const toast = useToast()

  const icons = user.icons

  const onDragEnd = (result: any) => {
    if (!result.destination) {
      return
    }
    const items = reorder(user.icons, result.source.index, result.destination.index) as TIcon[]
    setUser({ ...user, icons: items })
  }

  const openTest = (todo: any) => {
    setSelectedIcon(ICON_OPTIONS.find((option: any) => option.name === todo.name))
    setModalOpen(true)
  }

  return (
    <>
      <Flex>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="droppable" direction="horizontal">
            {(provided: any) => (
              <HStack {...provided.droppableProps} ref={provided.innerRef} spacing={0}>
                {icons &&
                  icons.map((todo: any, index: any) => (
                    <Draggable
                      key={`${todo.name}${todo.url}`}
                      draggableId={`${todo.name}${todo.url}` + ''}
                      index={index}
                    >
                      {(provided: any) => (
                        <Box
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          ref={provided.innerRef}
                          w="16"
                          onClick={() => openTest(todo)}
                        >
                          <Icon key={`${todo.name}${todo.url}`} icon={todo} />
                        </Box>
                      )}
                    </Draggable>
                  ))}
                {provided.placeholder}
              </HStack>
            )}
          </Droppable>
        </DragDropContext>
        <Box
          as={GrAddCircle}
          size={40}
          onClick={() => {
            if (icons.length === 5) {
              toast({ title: 'Max 5 icons!', status: 'error' })
            } else {
              setModalOpen(true)
            }
          }}
          _hover={{ opacity: 0.7, transform: 'scale(1.05)' }}
          _active={{ opacity: 0.9, transform: 'scale(0.94)' }}
          transitionDuration="0.5s"
          cursor="pointer"
        />
      </Flex>
    </>
  )
}

export default Icons
