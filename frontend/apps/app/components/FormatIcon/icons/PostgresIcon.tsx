import type { FC } from 'react'

interface IconProps {
  size?: number
}

export const PostgresIcon: FC<IconProps> = ({ size = 16 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <g clipPath="url(#clip0_postgres)">
        <path
          d="M15.7182 9.58443C15.6248 9.30204 15.3805 9.10515 15.0647 9.05809C14.9156 9.03581 14.7449 9.04515 14.543 9.08683C14.1909 9.1594 13.9301 9.18707 13.7393 9.19246C14.4586 7.9781 15.0435 6.59309 15.3801 5.28928C15.9244 3.18141 15.6334 2.22106 15.2935 1.7867C14.3939 0.637015 13.0815 0.0194192 11.4974 0.000377565C10.6527 -0.00896361 9.91084 0.157022 9.5239 0.276661C9.16355 0.213069 8.77625 0.177501 8.36991 0.171034C7.60824 0.159178 6.93496 0.324804 6.35976 0.666116C6.04108 0.558333 5.53019 0.406719 4.9399 0.309714C3.55202 0.0819332 2.43323 0.259416 1.6148 0.837491C0.624275 1.53772 0.16512 2.75387 0.249909 4.45253C0.276855 4.9918 0.578646 6.63261 1.05361 8.18864C1.32666 9.08288 1.61767 9.82586 1.91875 10.3964C2.34557 11.2055 2.80257 11.6819 3.31561 11.8533C3.60303 11.9492 4.12542 12.0164 4.67511 11.5586C4.74481 11.6431 4.8375 11.7268 4.9611 11.8048C5.11774 11.9036 5.30923 11.9844 5.50037 12.0322C6.18946 12.2046 6.83508 12.1615 7.38585 11.9201C7.38908 12.0182 7.39196 12.1119 7.39411 12.1928C7.39771 12.3239 7.4013 12.4522 7.40597 12.5722C7.43866 13.3848 7.49399 14.0168 7.65782 14.4587C7.6668 14.4832 7.67902 14.5202 7.69159 14.5593C7.77315 14.8097 7.91003 15.2287 8.25745 15.5567C8.61745 15.8965 9.05325 16.0007 9.45205 16.0007C9.65216 16.0007 9.84294 15.9745 10.0104 15.9386C10.6071 15.8107 11.2847 15.616 11.7751 14.9179C12.2386 14.2579 12.4639 13.2638 12.5048 11.6977C12.5102 11.6535 12.5149 11.6111 12.5195 11.5709C12.5228 11.5436 12.526 11.5159 12.5292 11.4879L12.6385 11.4976L12.6668 11.4994C13.2744 11.527 14.0177 11.3981 14.4744 11.1861C14.8351 11.0187 15.9909 10.4086 15.7185 9.58479L15.7182 9.58443Z"
          fill="black"
        />
        <path
          d="M14.6789 9.74489C12.8717 10.1178 12.7474 9.50561 12.7474 9.50561C14.6555 6.67415 15.4531 3.08031 14.7647 2.20045C12.8872 -0.1988 9.63643 0.936154 9.58218 0.965614L9.56458 0.968848C9.20746 0.894837 8.80794 0.850646 8.35884 0.843101C7.54113 0.829808 6.92066 1.05759 6.45001 1.41435C6.45001 1.41435 0.650936 -0.974836 0.920753 4.41898C0.978237 5.5665 2.56552 13.1012 4.45854 10.8252C5.15051 9.99314 5.81912 9.28932 5.81912 9.28932C6.15109 9.50992 6.54881 9.62237 6.96557 9.58213L6.99791 9.55447C6.98785 9.65794 6.99252 9.7589 7.01084 9.87854C6.52294 10.4236 6.6663 10.5191 5.69158 10.72C4.70501 10.9233 5.28452 11.2851 5.66284 11.3799C6.12163 11.4946 7.18293 11.6573 7.90005 10.6535L7.87131 10.7681C8.06244 10.9212 8.19645 11.7637 8.17418 12.5275C8.15154 13.2913 8.13681 13.8155 8.28735 14.2251C8.43789 14.6346 8.58806 15.5562 9.8696 15.2817C10.9406 15.0521 11.4957 14.4575 11.5729 13.4655C11.6279 12.7603 11.7518 12.8645 11.7594 12.2339L11.8589 11.9354C11.9735 10.9794 11.8772 10.6707 12.5369 10.8144L12.6971 10.8285C13.1828 10.8507 13.8184 10.7505 14.1913 10.577C14.9947 10.204 15.4711 9.58177 14.6789 9.74524V9.74489Z"
          fill="#336791"
        />
        <path
          d="M12.1848 4.93648C12.1693 4.8251 11.971 4.79349 11.7835 4.81971C11.5959 4.84594 11.4138 4.93037 11.4289 5.04211C11.4411 5.12869 11.5977 5.27707 11.7831 5.27707C11.7986 5.27707 11.8144 5.27599 11.8305 5.27384C11.9541 5.25659 12.045 5.17827 12.0881 5.133C12.1539 5.06402 12.192 4.98714 12.1848 4.9372V4.93648Z"
          fill="white"
        />
        <path
          d="M15.2801 9.70218C15.2111 9.4938 14.9895 9.42662 14.6209 9.50278C13.5269 9.72841 13.1349 9.57212 13.0063 9.47763C13.8567 8.18208 14.5565 6.616 14.9338 5.15483C15.1127 4.46286 15.2111 3.81976 15.2194 3.29593C15.2284 2.72073 15.1303 2.29822 14.9284 2.04026C14.1139 0.999438 12.9186 0.441482 11.4718 0.426033C10.477 0.416692 9.63662 0.669622 9.47387 0.741118C9.13076 0.655611 8.75676 0.603516 8.34934 0.59669C7.60276 0.583756 6.95714 0.763034 6.42254 1.1277C6.19045 1.04111 5.59045 0.835249 4.85681 0.717406C3.58821 0.512978 2.58044 0.667826 1.86117 1.17728C1.00358 1.78517 0.607296 2.87198 0.684181 4.40753C0.710049 4.92417 1.0043 6.51325 1.46884 8.03514C2.08033 10.0385 2.74499 11.1723 3.44414 11.4055C3.52605 11.4328 3.62054 11.4519 3.72437 11.4519C3.97946 11.4519 4.29239 11.3369 4.61754 10.9456C5.15789 10.2953 5.66267 9.75033 5.84877 9.55236C6.12362 9.70003 6.42577 9.7823 6.73475 9.79056C6.73511 9.79847 6.73655 9.80637 6.73726 9.81428C6.67511 9.88793 6.62409 9.9526 6.58062 10.0076C6.36649 10.2792 6.32194 10.3359 5.63321 10.4775C5.4374 10.5177 4.91681 10.6252 4.90927 10.9902C4.901 11.3886 5.52435 11.556 5.59549 11.574C5.84303 11.6358 6.08158 11.6667 6.30901 11.6667C6.86229 11.6667 7.34911 11.4849 7.73821 11.1332C7.72635 12.5545 7.78563 13.9546 7.95629 14.3814C8.09605 14.7306 8.43736 15.5842 9.51591 15.5842C9.67399 15.5842 9.84824 15.5659 10.0401 15.5246C11.1657 15.2832 11.6543 14.7859 11.8433 13.6891C11.9446 13.1027 12.1181 11.7034 12.1997 10.9525C12.3722 11.0064 12.5938 11.0308 12.8338 11.0308C13.3339 11.0308 13.9113 10.9244 14.2734 10.7567C14.6801 10.5677 15.4138 10.1042 15.2808 9.70182L15.2801 9.70218ZM11.5279 0.87441C12.8241 0.903152 13.8499 1.38817 14.5759 2.31583C15.1328 3.02755 14.5195 6.26571 12.7444 9.05908C12.7268 9.0368 12.7092 9.01417 12.6905 8.99117C12.6829 8.98183 12.6757 8.97249 12.6678 8.96315C13.1266 8.20544 13.0368 7.45599 12.9571 6.79133C12.9244 6.51864 12.8935 6.26104 12.9014 6.01888C12.9096 5.76236 12.9434 5.54248 12.9761 5.32979C13.0163 5.06788 13.0573 4.79663 13.0462 4.47687C13.0544 4.44346 13.058 4.40358 13.0537 4.35687C13.025 4.05005 12.6747 3.13282 11.9611 2.30217C11.571 1.84805 11.0019 1.33967 10.2248 0.996923C10.5589 0.927583 11.0159 0.862913 11.5279 0.87441ZM12.5126 6.84522C12.5798 7.40533 12.6492 7.98233 12.3815 8.55142C12.3398 8.47777 12.2999 8.39693 12.2629 8.30783C12.2295 8.22735 12.1573 8.09766 12.0574 7.91874C11.6687 7.22138 10.7579 5.58847 11.2243 4.92201C11.3629 4.72369 11.7154 4.51963 12.5999 4.62956C12.5963 4.85124 12.5658 5.05243 12.5335 5.26225C12.4986 5.48823 12.4627 5.72176 12.4537 6.00523C12.4447 6.28116 12.4792 6.56786 12.5126 6.84522ZM4.27335 10.6593C3.91479 11.0904 3.66725 11.0078 3.58569 10.9805C3.05504 10.8034 2.4396 9.68242 1.8971 7.90401C1.42752 6.36559 1.15304 4.81854 1.13148 4.38454C1.06286 3.01246 1.39555 2.05643 2.11985 1.54266C3.29899 0.706269 5.23765 1.2071 6.01656 1.46075C6.00542 1.47189 5.99356 1.48195 5.98243 1.49344C4.70412 2.78432 4.7343 4.98956 4.73753 5.12501C4.73753 5.1771 4.74184 5.25075 4.74759 5.35207C4.76951 5.72284 4.81047 6.41337 4.70125 7.19551C4.59957 7.92197 4.82376 8.63334 5.31561 9.14674C5.36663 9.19991 5.4198 9.24985 5.47477 9.29656C5.25561 9.53117 4.77957 10.05 4.27299 10.6593H4.27335ZM5.63932 8.83669C5.24268 8.4228 5.06268 7.84724 5.14531 7.25731C5.26064 6.43133 5.21824 5.71206 5.19525 5.32548C5.19202 5.27159 5.18914 5.22417 5.18771 5.18644C5.37453 5.02081 6.23967 4.55735 6.8569 4.69854C7.13858 4.76321 7.31031 4.95471 7.38145 5.28452C7.75078 6.99216 7.43031 7.70425 7.17307 8.27586C7.11989 8.3937 7.06995 8.50507 7.0272 8.6204L6.99415 8.7095C6.91008 8.93477 6.83211 9.14387 6.78361 9.34291C6.36218 9.34147 5.95189 9.16147 5.64004 8.83597L5.63932 8.83669ZM5.70435 11.14C5.58111 11.1091 5.47046 11.0559 5.40543 11.0114C5.45968 10.9859 5.55632 10.951 5.72375 10.9165C6.53427 10.7498 6.6593 10.632 6.93271 10.2849C6.99522 10.2055 7.06636 10.115 7.1648 10.0054C7.31139 9.84158 7.37821 9.86925 7.50001 9.91954C7.59845 9.9605 7.69438 10.0837 7.73354 10.2195C7.75186 10.2838 7.7727 10.4056 7.70479 10.5001C7.13391 11.2995 6.30182 11.2895 5.70435 11.1396V11.14ZM11.7934 10.5106C11.7599 10.9334 11.5225 12.9134 11.4014 13.6133C11.2419 14.5377 10.902 14.8819 9.9456 15.087C8.954 15.2997 8.60299 14.7935 8.37161 14.215C8.22215 13.8418 8.14886 12.1582 8.20096 10.2986C8.20167 10.2738 8.19808 10.2501 8.19125 10.2278C8.18515 10.1843 8.17617 10.1405 8.16359 10.0963C8.08599 9.82577 7.89737 9.59943 7.67102 9.50566C7.5812 9.46829 7.41594 9.40003 7.21762 9.45069C7.26001 9.27644 7.3333 9.07956 7.4127 8.86651L7.44612 8.77669C7.48384 8.67573 7.53091 8.57082 7.58084 8.46016C7.8503 7.86161 8.21928 7.0421 7.81869 5.19003C7.66887 4.49627 7.1684 4.15783 6.40853 4.23652C5.95332 4.28358 5.53692 4.46717 5.32926 4.5728C5.28471 4.59543 5.24375 4.61735 5.20567 4.63855C5.26351 3.93975 5.48267 2.63378 6.30182 1.80745C6.81774 1.28722 7.50396 1.03069 8.34179 1.04399C9.99087 1.07093 11.0486 1.91739 11.6453 2.62265C12.1598 3.23054 12.4383 3.84275 12.5493 4.17292C11.7136 4.08813 11.1449 4.25304 10.8567 4.66513C10.2298 5.56117 11.1998 7.30078 11.6658 8.13682C11.7513 8.29023 11.825 8.42244 11.8483 8.47885C11.9999 8.84675 12.1968 9.09249 12.3402 9.27177C12.384 9.32674 12.4268 9.37991 12.4591 9.42626C12.2058 9.49919 11.7513 9.66805 11.7926 10.5109L11.7934 10.5106ZM14.0845 10.351C13.8254 10.471 13.3925 10.5612 12.9808 10.5806C12.5259 10.6018 12.2949 10.5296 12.2403 10.4854C12.2148 9.96014 12.4102 9.90517 12.6172 9.84733C12.6495 9.83835 12.6815 9.82937 12.712 9.81859C12.7311 9.83404 12.7519 9.84949 12.7745 9.86457C13.1399 10.1056 13.7916 10.1319 14.7114 9.94182C14.715 9.9411 14.7182 9.94038 14.7215 9.93966C14.5975 10.0557 14.3852 10.2113 14.0841 10.3514L14.0845 10.351Z"
          fill="white"
        />
        <path
          d="M7.17562 5.19626C7.18101 5.15674 7.17238 5.08058 7.05131 5.01303C6.98233 4.97459 6.88963 4.94585 6.7894 4.93183C6.62664 4.9092 6.47898 4.93004 6.40425 4.98644C6.36222 5.01806 6.34928 5.05507 6.34569 5.08022C6.33635 5.1474 6.38341 5.22177 6.41216 5.25985C6.49407 5.36835 6.61335 5.44273 6.73155 5.45925C6.7488 5.46177 6.76568 5.46284 6.78257 5.46284C6.97981 5.46284 7.15909 5.30943 7.1749 5.1959L7.17562 5.19626Z"
          fill="white"
        />
      </g>
      <defs>
        <clipPath id="clip0_postgres">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}
