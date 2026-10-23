import { useNavigationStore } from './navigation.store'

describe('navigation.store', () => {
  beforeEach(() => useNavigationStore.setState({ isDrawerOpen: false }))

  it('começa fechado', () => {
    expect(useNavigationStore.getState().isDrawerOpen).toBe(false)
  })

  it('abre e fecha', () => {
    useNavigationStore.getState().openDrawer()
    expect(useNavigationStore.getState().isDrawerOpen).toBe(true)

    useNavigationStore.getState().closeDrawer()
    expect(useNavigationStore.getState().isDrawerOpen).toBe(false)
  })
})
