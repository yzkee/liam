import type { ComponentPropsWithoutRef, FC } from 'react'

type Props = Omit<ComponentPropsWithoutRef<'svg'>, 'xmlns'> & {
  opacity?: number
}

export const ProjectIcon: FC<Props> = ({
  opacity = 0.2,
  width = 40,
  height = 40,
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 40 40"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    <path
      d="M27 0V0.5H28C28.3041 0.5 28.6053 0.512017 28.9033 0.535156L28.9414 0.0361328C29.5769 0.0854502 30.1978 0.187548 30.8018 0.332031L30.6865 0.81543C31.2774 0.956806 31.8509 1.14339 32.4023 1.37207L32.5918 0.912109C33.1757 1.15419 33.7364 1.44024 34.2695 1.76758L34.0088 2.19238C34.5234 2.5084 35.0118 2.86422 35.4688 3.25488L35.791 2.87695C36.2688 3.28534 36.7136 3.73031 37.1221 4.20801L36.7451 4.53125C37.1358 4.98822 37.4916 5.47659 37.8076 5.99121L38.2314 5.72949C38.5589 6.26258 38.8448 6.82334 39.0869 7.40723L38.6279 7.59766C38.8566 8.14912 39.0432 8.72265 39.1846 9.31348L39.667 9.19727C39.8115 9.8012 39.9135 10.422 39.9629 11.0576L39.4648 11.0967C39.488 11.3947 39.5 11.6959 39.5 12V13H40V15H39.5V17H40V19H39.5V21H40V23H39.5V25H40V27H39.5V28C39.5 28.3041 39.488 28.6053 39.4648 28.9033L39.9629 28.9414C39.9136 29.577 39.8115 30.1978 39.667 30.8018L39.1846 30.6865C39.0432 31.2774 38.8566 31.8509 38.6279 32.4023L39.0869 32.5918C38.8448 33.1757 38.5588 33.7364 38.2314 34.2695L37.8076 34.0088C37.4916 34.5234 37.1358 35.0118 36.7451 35.4688L37.1221 35.791C36.7136 36.2688 36.2688 36.7136 35.791 37.1221L35.4688 36.7451C35.0118 37.1358 34.5234 37.4916 34.0088 37.8076L34.2695 38.2314C33.7364 38.5588 33.1757 38.8448 32.5918 39.0869L32.4023 38.6279C31.8509 38.8566 31.2774 39.0432 30.6865 39.1846L30.8018 39.667C30.1978 39.8115 29.577 39.9136 28.9414 39.9629L28.9033 39.4648C28.6053 39.488 28.3041 39.5 28 39.5H27V40H25V39.5H23V40H21V39.5H19V40H17V39.5H15V40H13V39.5H12C11.6959 39.5 11.3947 39.488 11.0967 39.4648L11.0576 39.9629C10.422 39.9135 9.8012 39.8115 9.19727 39.667L9.31348 39.1846C8.72265 39.0432 8.14912 38.8566 7.59766 38.6279L7.40723 39.0869C6.82334 38.8448 6.26258 38.5589 5.72949 38.2314L5.99121 37.8076C5.47659 37.4916 4.98822 37.1358 4.53125 36.7451L4.20801 37.1221C3.73031 36.7136 3.28534 36.2688 2.87695 35.791L3.25488 35.4688C2.86422 35.0118 2.5084 34.5234 2.19238 34.0088L1.76758 34.2695C1.44024 33.7364 1.15419 33.1757 0.912109 32.5918L1.37207 32.4023C1.14339 31.8509 0.956806 31.2774 0.81543 30.6865L0.332031 30.8018C0.187548 30.1978 0.0854502 29.5769 0.0361328 28.9414L0.535156 28.9033C0.512017 28.6053 0.5 28.3041 0.5 28V27H0V25H0.5V23H0V21H0.5V19H0V17H0.5V15H0V13H0.5V12C0.5 11.6959 0.512017 11.3947 0.535156 11.0967L0.0361328 11.0576C0.0855006 10.4221 0.187501 9.80116 0.332031 9.19727L0.81543 9.31348C0.956806 8.72265 1.14339 8.14912 1.37207 7.59766L0.912109 7.40723C1.15422 6.82338 1.44022 6.26255 1.76758 5.72949L2.19238 5.99121C2.5084 5.47659 2.86422 4.98822 3.25488 4.53125L2.87695 4.20801C3.28534 3.73031 3.73031 3.28534 4.20801 2.87695L4.53125 3.25488C4.98822 2.86422 5.47659 2.5084 5.99121 2.19238L5.72949 1.76758C6.26255 1.44022 6.82338 1.15422 7.40723 0.912109L7.59766 1.37207C8.14912 1.14339 8.72265 0.956806 9.31348 0.81543L9.19727 0.332031C9.80116 0.187501 10.4221 0.0855006 11.0576 0.0361328L11.0967 0.535156C11.3947 0.512017 11.6959 0.5 12 0.5H13V0H15V0.5H17V0H19V0.5H21V0H23V0.5H25V0H27Z"
      stroke="white"
      strokeOpacity={opacity}
      strokeDasharray="2 2"
    />
    <path
      d="M12.5372 29.7209C12.3208 29.7137 12.314 29.7113 12.3816 29.4953C12.5958 28.8041 15.0824 20.8191 16.1172 17.519C16.187 17.2982 16.142 17.1374 16.0135 16.9886C15.1545 15.9758 14.5684 14.783 14.0431 13.5566C13.6802 12.7045 13.3939 11.8165 13.1887 10.9021C13.1481 10.7245 13.2022 10.6717 13.3217 10.6333C13.9732 10.4173 14.627 10.2109 15.2785 9.98769C15.4183 9.93969 15.4769 9.95169 15.531 10.1125C15.7226 10.6813 15.912 11.2525 16.1397 11.8045C16.3584 12.3349 16.6176 12.8462 16.8701 13.3622C16.9873 13.6022 17.1181 13.8374 17.2579 14.063C17.3954 14.2886 17.4044 14.2838 17.5509 14.051C17.596 13.979 17.6298 13.8998 17.6704 13.8254C18.1055 13.0502 18.606 12.3277 19.2102 11.6917C20.0623 10.7941 21.052 10.1653 22.2266 9.87729C22.6797 9.76689 23.1351 9.71889 23.6017 9.71409C24.2893 9.70689 24.9656 9.75249 25.6307 9.94449C26.3566 10.1533 27.0036 10.5229 27.5943 11.0197C28.2818 11.5981 28.7237 12.3517 29.01 13.2134C29.1205 13.5446 29.143 13.9094 29.1971 14.2598C29.2129 14.3678 29.1926 14.483 29.2016 14.5934C29.2422 15.2054 29.1475 15.8006 28.983 16.379C28.8251 16.9382 28.5659 17.4518 28.2368 17.9175C27.5695 18.8583 26.7083 19.5183 25.6645 19.9167C25.0851 20.1375 24.4922 20.2671 23.8858 20.3679C23.223 20.4807 22.5602 20.4615 21.9064 20.4135C21.0678 20.3487 20.2404 20.1471 19.4604 19.7799C19.2913 19.7007 19.12 19.6239 18.9509 19.5447C18.7435 19.4463 18.7232 19.4511 18.6511 19.6719C18.5136 20.0919 16.568 26.56 16.5523 26.6056C16.5184 26.6944 16.532 26.7472 16.6334 26.7472C16.7258 26.7472 23.3831 26.7472 26.6158 26.7472C27.0239 26.7472 27.0938 26.6656 26.9653 27.2056C26.7939 27.9328 26.6361 28.6625 26.4693 29.3921C26.3949 29.7185 26.3927 29.7209 26.0748 29.7209C23.8294 29.7209 12.6003 29.7209 12.5304 29.7209H12.5372ZM24.0797 12.6181C24.0458 12.6181 24.0098 12.6205 23.976 12.6181C23.2252 12.5581 22.5309 12.7309 21.9177 13.2086C21.6111 13.4462 21.3248 13.7006 21.07 14.0126C20.4343 14.7902 20.0218 15.6902 19.6408 16.619C19.5979 16.7246 19.5889 16.7942 19.7016 16.8566C19.9992 17.0198 20.2855 17.2166 20.5921 17.3606C21.1016 17.6006 21.6336 17.7782 22.1905 17.8142C22.5196 17.8358 22.851 17.8455 23.1847 17.8335C23.9083 17.8047 24.5801 17.6174 25.1866 17.2046C25.9824 16.6598 26.413 15.8798 26.4084 14.8574C26.4062 14.2862 26.192 13.7774 25.8246 13.3982C25.3534 12.911 24.774 12.5941 24.0819 12.6205L24.0797 12.6181Z"
      fill="white"
      fillOpacity={opacity}
    />
  </svg>
)
